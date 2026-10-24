import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: user.toJSON() });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    const updateData: Record<string, any> = {};
    if (body.aid !== undefined) updateData.aid = body.aid;
    if (body.useCase !== undefined) updateData.useCase = body.useCase;
    if (body.teamSize !== undefined) updateData.teamSize = body.teamSize;
    if (body.fieldOfWork !== undefined) updateData.fieldOfWork = body.fieldOfWork;

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email.toLowerCase() },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: updatedUser.toJSON() });
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
