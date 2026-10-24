import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { repoCache, CACHE_TTL, invalidateUserCache } from "@/lib/repo-cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";

    // Generate path-specific cache keys
    const cacheKey = `${session.user.email}-${id}-path-${path || "root"}`;
    const cached = repoCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return NextResponse.json(cached.data);
    }

    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data();
    const repo = (userData.repositories || []).find((r: any) => r.id.toString() === id);
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found in your account" }, { status: 404 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "OAuth session expired" }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ZeroOps",
    };

    // Case A: Just fetch sub-folder contents
    if (path) {
      let folderFiles: any[] = [];
      try {
        const contentsRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
          headers,
        });

        if (contentsRes.ok) {
          const contentsData = await contentsRes.json();
          if (Array.isArray(contentsData)) {
            folderFiles = contentsData.map((item: any) => ({
              name: item.name,
              path: item.path,
              type: item.type, // "file" or "dir"
              size: item.size,
              html_url: item.html_url,
            }));
            // Sort: directories first, then alphabetically
            folderFiles.sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === "dir" ? -1 : 1;
            });
          }
        } else {
          return NextResponse.json({ success: false, error: `Failed to fetch directory contents: Status ${contentsRes.status}` }, { status: contentsRes.status });
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }

      const responsePayload = {
        success: true,
        files: folderFiles,
      };

      repoCache.set(cacheKey, {
        timestamp: Date.now(),
        data: responsePayload,
      });

      return NextResponse.json(responsePayload);
    }

    // Case B: Initial root load (fetch README, commits, and root files)
    let readmeHtml = "";
    let hasReadme = false;
    let files: any[] = [];
    let commits: any[] = [];

    // 1. Fetch README (with HTML rendering header)
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
        headers: {
          ...headers,
          Accept: "application/vnd.github.html",
        },
      });

      if (readmeRes.ok) {
        readmeHtml = await readmeRes.text();
        hasReadme = true;
      } else {
        readmeHtml = `<div class="text-zinc-500 font-mono text-xs italic p-4">No README.md found in this repository.</div>`;
      }
    } catch (err) {
      console.error("Error fetching README:", err);
      readmeHtml = `<div class="text-rose-500 font-mono text-xs p-4">Error loading README from GitHub.</div>`;
    }

    // 2. Fetch Root Directory Contents
    try {
      const contentsRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents`, {
        headers,
      });

      if (contentsRes.ok) {
        const contentsData = await contentsRes.json();
        if (Array.isArray(contentsData)) {
          files = contentsData.map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type, // "file" or "dir"
            size: item.size,
            html_url: item.html_url,
          }));
          // Sort: directories first, then alphabetically
          files.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "dir" ? -1 : 1;
          });
        }
      }
    } catch (err) {
      console.error("Error fetching repository contents:", err);
    }

    // 3. Fetch Recent Commits (top 15)
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${repo.full_name}/commits?per_page=15`, {
        headers,
      });

      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        if (Array.isArray(commitsData)) {
          commits = commitsData.map((item: any) => ({
            sha: item.sha,
            message: item.commit.message,
            author_name: item.commit.author.name,
            author_email: item.commit.author.email,
            author_date: item.commit.author.date,
            author_avatar: item.author?.avatar_url || "",
            author_login: item.author?.login || item.commit.author.name,
            html_url: item.html_url,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching repository commits:", err);
    }

    const responsePayload = {
      success: true,
      repository: repo,
      readmeHtml,
      hasReadme,
      files,
      commits,
    };

    repoCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Error in repository GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data();
    const repo = (userData.repositories || []).find((r: any) => r.id.toString() === id);
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found" }, { status: 404 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Call GitHub API to delete the repository
    const res = await fetch(`https://api.github.com/repos/${repo.full_name}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
      },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      // If repository is already deleted on GitHub, let's still clean it up from MongoDB!
      if (res.status !== 404) {
        return NextResponse.json({ success: false, error: err.message || `GitHub error: Status ${res.status}` }, { status: res.status });
      }
    }

    // Delete repository from user profile
    const updatedRepos = (userData.repositories || []).filter((r: any) => r.id !== repo.id);
    await updateDoc(userRef, {
      repositories: updatedRepos,
      updatedAt: new Date().toISOString()
    });

    // Invalidate caches
    if (session.user.email) {
      invalidateUserCache(session.user.email);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting repository:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
