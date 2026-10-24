import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, private: isPrivate } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, error: "Repository name is required" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Call GitHub API to create the repository
    const res = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: description || "",
        private: isPrivate ?? false,
        auto_init: true, // Automatically create a README so the repo is immediately viewable
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || `GitHub error: Status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // Map to user repositories schema
    const newRepo = {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      html_url: data.html_url,
      description: data.description || "",
      private: data.private ?? false,
      created_at: data.created_at || "",
      updated_at: data.updated_at || "",
      pushed_at: data.pushed_at || "",
      stargazers_count: data.stargazers_count || 0,
      watchers_count: data.watchers_count || 0,
      language: data.language || "",
      forks_count: data.forks_count || 0,
    };

    // Save to MongoDB
    user.repositories.push(newRepo as any);
    await user.save();

    // Invalidate local user caches
    invalidateUserCache(session.user.email);

    return NextResponse.json({ success: true, repository: newRepo });
  } catch (error: any) {
    console.error("Error creating repository:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
