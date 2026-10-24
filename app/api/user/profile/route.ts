import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: { id: userSnap.id, ...userSnap.data() } });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userRef = doc(db, "users", session.user.email!);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.aid !== undefined) updateData.aid = body.aid;
    if (body.useCase !== undefined) updateData.useCase = body.useCase;
    if (body.teamSize !== undefined) updateData.teamSize = body.teamSize;
    if (body.fieldOfWork !== undefined) updateData.fieldOfWork = body.fieldOfWork;
    updateData.updatedAt = new Date().toISOString();

    await updateDoc(userRef, updateData);

    const updatedSnap = await getDoc(userRef);
    return NextResponse.json({ success: true, profile: { id: updatedSnap.id, ...updatedSnap.data() } });
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
