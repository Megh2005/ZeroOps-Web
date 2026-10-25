import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { User, Commit } from "@/lib/models";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, branch, path, content, message } = await request.json();
    if (!repoId || !branch || !path || !content) {
      return NextResponse.json({ success: false, error: "Missing required parameters: repoId, branch, path, content" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const repo = (user.repositories || []).find((r: any) => r.id.toString() === repoId.toString());
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found" }, { status: 404 });
    }

    const accessToken = (session as any).accessToken || process.env.GITHUB_PRIVATE_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ZeroOps",
      "Content-Type": "application/json",
    };

    // Step 1: Check if branch exists. If not, create it.
    let branchExists = false;
    try {
      const branchRes = await fetch(`https://api.github.com/repos/${repo.full_name}/branches/${branch}`, {
        headers,
      });
      if (branchRes.ok) {
        branchExists = true;
      }
    } catch (err) {
      console.error("Error checking branch existence:", err);
    }

    if (!branchExists) {
      // Find the base branch to branch off from (default branch, e.g. main or master)
      let baseBranch = "main";
      let baseSha = "";

      // Try checking main
      let baseRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/ref/heads/main`, { headers });
      if (!baseRes.ok) {
        // Fallback to master
        baseRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/ref/heads/master`, { headers });
        baseBranch = "master";
      }

      if (baseRes.ok) {
        const baseData = await baseRes.json();
        baseSha = baseData.object.sha;
      } else {
        // If repo is completely empty, it might not have ref/heads yet. In that case, we can only write to main directly.
        if (branch !== "main" && branch !== "master") {
          return NextResponse.json({ success: false, error: "Cannot create new branch because repository has no default commits (is empty). Please push to 'main' first." }, { status: 400 });
        }
      }

      if (baseSha) {
        // Create the branch ref
        const createRefRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: baseSha,
          }),
        });

        if (!createRefRes.ok) {
          const refErr = await createRefRes.json().catch(() => ({}));
          return NextResponse.json({ success: false, error: refErr.message || `Failed to create branch: Status ${createRefRes.status}` }, { status: createRefRes.status });
        }
      }
    }

    // Step 2: Check if file already exists on target branch to fetch its SHA and content
    let existingSha: string | undefined = undefined;
    let previousContent: string | null = null;
    try {
      const fileCheckRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
        headers,
      });
      if (fileCheckRes.ok) {
        const fileCheckData = await fileCheckRes.json();
        existingSha = fileCheckData.sha;
        if (fileCheckData.content) {
          previousContent = Buffer.from(fileCheckData.content, "base64").toString("utf-8");
        }
      }
    } catch (err) {
      console.error("Error checking file existence:", err);
    }

    // Step 3: Base64 encode the new content
    const base64Content = Buffer.from(content).toString("base64");

    // Step 4: PUT/commit the file to GitHub
    const putBody: any = {
      message: message || (existingSha ? `Update ${path} via ZeroOps` : `Create ${path} via ZeroOps`),
      content: base64Content,
      branch,
    };
    if (existingSha) {
      putBody.sha = existingSha;
    }

    const commitRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(putBody),
    });

    if (!commitRes.ok) {
      const commitErr = await commitRes.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: commitErr.message || `Failed to commit file to GitHub: Status ${commitRes.status}` }, { status: commitRes.status });
    }

    const commitData = await commitRes.json();

    // Invalidate local user caches so file tree is refreshed
    invalidateUserCache(session.user.email);

    // Save commit info to MongoDB
    try {
      await Commit.create({
        sha: commitData.commit.sha,
        userEmail: session.user.email.toLowerCase(),
        repoId: repoId.toString(),
        repoName: repo.full_name,
        branch,
        path,
        action: existingSha ? "update" : "create",
        message: putBody.message,
        content,
        previousContent,
        previousSha: existingSha || null,
        shaAfter: commitData.content.sha,
        timestamp: new Date(),
      });
    } catch (dbErr) {
      console.error("Failed to save commit log to MongoDB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      commit: commitData.commit,
      content: commitData.content,
      modified: !!existingSha,
    });
  } catch (error: any) {
    console.error("Error in repository push POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
