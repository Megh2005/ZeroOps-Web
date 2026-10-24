import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { User, Commit } from "@/lib/models";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ success: false, error: "Path parameter is required" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const repo = (user.repositories || []).find((r: any) => r.id.toString() === id.toString());
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found in your account" }, { status: 404 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "OAuth session expired. Please sign out and log back in." }, { status: 401 });
    }

    // Fetch file contents from GitHub
    const fileRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
      },
    });

    if (!fileRes.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch file contents from GitHub: Status ${fileRes.status}` },
        { status: fileRes.status }
      );
    }

    const fileData = await fileRes.json();
    if (fileData.type !== "file") {
      return NextResponse.json({ success: false, error: "Target path is not a file" }, { status: 400 });
    }

    // Decode base64 contents
    const rawContent = Buffer.from(fileData.content, "base64").toString("utf-8");

    return NextResponse.json({
      success: true,
      name: fileData.name,
      path: fileData.path,
      size: fileData.size,
      sha: fileData.sha,
      content: rawContent,
    });
  } catch (error: any) {
    console.error("Error in repository file GET:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { path, content, sha, message } = await request.json();

    if (!path || content === undefined) {
      return NextResponse.json({ success: false, error: "Missing required parameters: path and content" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const repo = (user.repositories || []).find((r: any) => r.id.toString() === id.toString());
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found" }, { status: 404 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Base64 encode the new content
    const base64Content = Buffer.from(content).toString("base64");

    const body: any = {
      message: message || `Update ${path} via ZeroOps`,
      content: base64Content,
    };
    if (sha) {
      body.sha = sha;
    }

    // Fetch previous content if updating
    let previousContent: string | null = null;
    if (sha) {
      try {
        const fileRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
          },
        });
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.content) {
            previousContent = Buffer.from(fileData.content, "base64").toString("utf-8");
          }
        }
      } catch (err) {
        console.error("Error fetching previous file content:", err);
      }
    }

    const res = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: err.message || `GitHub error: Status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    // Log commit to MongoDB
    try {
      await Commit.create({
        sha: data.commit.sha,
        userEmail: session.user.email.toLowerCase(),
        repoId: id,
        repoName: repo.full_name,
        branch: "main",
        path,
        action: sha ? "update" : "create",
        message: body.message,
        content,
        previousContent,
        previousSha: sha || null,
        shaAfter: data.content.sha,
        timestamp: new Date(),
      });
    } catch (dbErr) {
      console.error("Failed to save commit log to MongoDB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      commit: data.commit,
      content: data.content,
    });
  } catch (error: any) {
    console.error("Error in PUT file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { path, sha, message } = await request.json();

    if (!path || !sha) {
      return NextResponse.json({ success: false, error: "Missing required parameters: path and sha" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const repo = (user.repositories || []).find((r: any) => r.id.toString() === id.toString());
    if (!repo) {
      return NextResponse.json({ success: false, error: "Repository not found" }, { status: 404 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Fetch file content prior to deletion to log it as previousContent
    let previousContent: string | null = null;
    try {
      const fileRes = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ZeroOps",
        },
      });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        if (fileData.content) {
          previousContent = Buffer.from(fileData.content, "base64").toString("utf-8");
        }
      }
    } catch (err) {
      console.error("Error fetching file content before deletion:", err);
    }

    const res = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(path)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ZeroOps",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Delete ${path} via ZeroOps`,
        sha,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: err.message || `GitHub error: Status ${res.status}` }, { status: res.status });
    }

    const deleteData = await res.json();

    // Log delete commit to MongoDB
    try {
      await Commit.create({
        sha: deleteData.commit.sha,
        userEmail: session.user.email.toLowerCase(),
        repoId: id,
        repoName: repo.full_name,
        branch: "main",
        path,
        action: "delete",
        message: message || `Delete ${path} via ZeroOps`,
        content: null,
        previousContent,
        previousSha: sha,
        shaAfter: null,
        timestamp: new Date(),
      });
    } catch (dbErr) {
      console.error("Failed to save delete commit log to MongoDB:", dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
