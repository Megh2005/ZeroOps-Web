import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Commit } from "@/lib/models";
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

    // Retrieve commit record from MongoDB
    await connectToDatabase();

    const queryConditions: any[] = [{ sha: commitId }];
    if (mongoose.Types.ObjectId.isValid(commitId)) {
      queryConditions.push({ _id: commitId });
    }

    const commitRecord = await Commit.findOne({ $or: queryConditions });
    if (!commitRecord) {
      return NextResponse.json({ success: false, error: "Commit record not found" }, { status: 404 });
    }

    if (commitRecord.userEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const accessToken = process.env.GITHUB_PRIVATE_ACCESS_TOKEN || (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "GitHub access token missing" }, { status: 401 });
    }

    // Perform Revert Operation on GitHub
    if (commitRecord.action === "create") {
      // Reverting a file creation means deleting the file
      // 1. Fetch the file's current SHA from GitHub
      const fileRes = await fetch(
        `https://api.github.com/repos/${commitRecord.repoName}/contents/${encodeURIComponent(commitRecord.path)}?ref=${commitRecord.branch}`,
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
          `https://api.github.com/repos/${commitRecord.repoName}/contents/${encodeURIComponent(commitRecord.path)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "ZeroOps",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Revert commit ${commitRecord.sha}: Delete ${commitRecord.path}`,
              sha: fileData.sha,
              branch: commitRecord.branch,
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
    } else if (commitRecord.action === "update") {
      // Reverting an update means restoring the previous file contents
      // 1. Fetch file's current SHA from GitHub
      const fileRes = await fetch(
        `https://api.github.com/repos/${commitRecord.repoName}/contents/${encodeURIComponent(commitRecord.path)}?ref=${commitRecord.branch}`,
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
      const base64Content = Buffer.from(commitRecord.previousContent || "").toString("base64");

      // 2. Update contents with previousContent
      const putRes = await fetch(
        `https://api.github.com/repos/${commitRecord.repoName}/contents/${encodeURIComponent(commitRecord.path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Revert commit ${commitRecord.sha}: Restore ${commitRecord.path}`,
            content: base64Content,
            sha: fileData.sha,
            branch: commitRecord.branch,
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
    } else if (commitRecord.action === "delete") {
      // Reverting a deletion means recreating the file with previousContent
      const base64Content = Buffer.from(commitRecord.previousContent || "").toString("base64");

      const putRes = await fetch(
        `https://api.github.com/repos/${commitRecord.repoName}/contents/${encodeURIComponent(commitRecord.path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "ZeroOps",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Revert commit ${commitRecord.sha}: Recreate ${commitRecord.path}`,
            content: base64Content,
            branch: commitRecord.branch,
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

    // Delete commit log record from MongoDB after successful revert
    await Commit.deleteOne({ _id: commitRecord._id });
    invalidateUserCache(session.user.email);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in commit revert POST:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
