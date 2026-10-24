import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invalidateUserCache } from "@/lib/repo-cache";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { commitId } = await request.json();
    if (!commitId) {
      return NextResponse.json({ success: false, error: "Commit ID is required" }, { status: 400 });
    }

    // Retrieve commit record from Firestore
    const commitRef = doc(db, "commits", commitId);
    const commitSnap = await getDoc(commitRef);
    if (!commitSnap.exists()) {
      return NextResponse.json({ success: false, error: "Commit record not found" }, { status: 404 });
    }

    const commitData = commitSnap.data();
    if (commitData.userEmail !== session.user.email) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Perform Revert Operation on GitHub
    if (commitData.action === "create") {
      // Reverting a file creation means deleting the file
      // 1. Fetch the file's current SHA from GitHub
      const fileRes = await fetch(
        `https://api.github.com/repos/${commitData.repoName}/contents/${encodeURIComponent(commitData.path)}?ref=${commitData.branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
          },
        }
      );

      if (fileRes.ok) {
        const fileData = await fileRes.json();
        // 2. Call delete
        const delRes = await fetch(
          `https://api.github.com/repos/${commitData.repoName}/contents/${encodeURIComponent(commitData.path)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "ZeroOps",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Revert commit ${commitData.sha}: Delete ${commitData.path}`,
              sha: fileData.sha,
              branch: commitData.branch,
            }),
          }
        );

        if (!delRes.ok) {
          const delErr = await delRes.json().catch(() => ({}));
          return NextResponse.json(
            { success: false, error: delErr.message || "Failed to delete file on GitHub" },
            { status: delRes.status }
          );
        }
      }
    } else if (commitData.action === "update") {
      // Reverting an update means restoring the previous file contents
      // 1. Fetch file's current SHA from GitHub
      const fileRes = await fetch(
        `https://api.github.com/repos/${commitData.repoName}/contents/${encodeURIComponent(commitData.path)}?ref=${commitData.branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
          },
        }
      );

      if (!fileRes.ok) {
        return NextResponse.json(
          { success: false, error: "Target file to restore could not be found on GitHub" },
          { status: fileRes.status }
        );
      }

      const fileData = await fileRes.json();
      const base64Content = Buffer.from(commitData.previousContent || "").toString("base64");

      // 2. Update contents with previousContent
      const putRes = await fetch(
        `https://api.github.com/repos/${commitData.repoName}/contents/${encodeURIComponent(commitData.path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Revert commit ${commitData.sha}: Restore ${commitData.path}`,
            content: base64Content,
            sha: fileData.sha,
            branch: commitData.branch,
          }),
        }
      );

      if (!putRes.ok) {
        const putErr = await putRes.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: putErr.message || "Failed to restore content on GitHub" },
          { status: putRes.status }
        );
      }
    } else if (commitData.action === "delete") {
      // Reverting a deletion means recreating the file with previousContent
      const base64Content = Buffer.from(commitData.previousContent || "").toString("base64");

      const putRes = await fetch(
        `https://api.github.com/repos/${commitData.repoName}/contents/${encodeURIComponent(commitData.path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Revert commit ${commitData.sha}: Recreate ${commitData.path}`,
            content: base64Content,
            branch: commitData.branch,
          }),
        }
      );

      if (!putRes.ok) {
        const putErr = await putRes.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: putErr.message || "Failed to recreate file on GitHub" },
          { status: putRes.status }
        );
      }
    }

    // Delete commit log record after successful revert
    await deleteDoc(commitRef);
    invalidateUserCache(session.user.email);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in commit revert POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
