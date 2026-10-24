import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Commit } from "@/lib/models";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const commits = await Commit.find({ userEmail: session.user.email.toLowerCase() })
      .sort({ timestamp: -1 })
      .lean();

    const commitsList = commits.map((doc: any) => ({
      id: doc._id?.toString(),
      ...doc,
    }));

    return NextResponse.json({ success: true, commits: commitsList });
  } catch (error: any) {
    console.error("Error fetching commits from MongoDB:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commitId = searchParams.get("id");
    if (!commitId) {
      return NextResponse.json({ success: false, error: "Commit ID is required" }, { status: 400 });
    }

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

    await Commit.deleteOne({ _id: commitRecord._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting commit log:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
