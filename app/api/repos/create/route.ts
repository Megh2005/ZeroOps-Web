import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, private: isPrivate } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, error: "Repository name is required" }, { status: 400 });
    }

    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
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
      description: data.description,
      private: data.private,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      stargazers_count: data.stargazers_count,
      watchers_count: data.watchers_count,
      language: data.language || "",
      forks_count: data.forks_count,
    };

    // Save to database
    await updateDoc(userRef, {
      repositories: arrayUnion(newRepo),
      updatedAt: new Date().toISOString()
    });

    // Invalidate local user caches
    if (session.user.email) {
      invalidateUserCache(session.user.email);
    }

    return NextResponse.json({ success: true, repository: newRepo });
  } catch (error: any) {
    console.error("Error creating repository:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
