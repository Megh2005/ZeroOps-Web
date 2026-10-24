import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session as any).accessToken) {
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
        forks_count: repo.forks_count || 0,
        private: repo.private || false,
        created_at: repo.created_at || "",
        updated_at: repo.updated_at || "",
      }));
    }

    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await updateDoc(userRef, {
      repositories,
      updatedAt: new Date(),
    });

    // Invalidate cached repository data on manual sync
    if (session.user.email) {
      invalidateUserCache(session.user.email);
    }

    return NextResponse.json({ success: true, repositories });
  } catch (error: any) {
    console.error("Error syncing repositories:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
