import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(session as any).accessToken) {
      return NextResponse.json(
        { success: false, error: "Session desynced. Please sign out and sign back in to authorize private repository access." },
        { status: 401 }
      );
    }

    const accessToken = (session as any).accessToken;

    // Fetch repositories from GitHub (all public & private)
    const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
      },
    });

    if (!reposResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch repositories from GitHub" }, { status: 500 });
    }

    const githubRepos = await reposResponse.json();
    let repositories: any[] = [];
    if (Array.isArray(githubRepos)) {
      repositories = githubRepos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description || "",
        language: repo.language || "",
        stargazers_count: repo.stargazers_count || 0,
        watchers_count: repo.watchers_count || 0,
        forks_count: repo.forks_count || 0,
        private: repo.private || false,
        created_at: repo.created_at || "",
        updated_at: repo.updated_at || "",
        pushed_at: repo.pushed_at || "",
      }));
    }

    await connectToDatabase();
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email.toLowerCase() },
      { $set: { repositories } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Invalidate cached repository data on manual sync
    invalidateUserCache(session.user.email);

    return NextResponse.json({ success: true, repositories });
  } catch (error: any) {
    console.error("Error syncing repositories:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
