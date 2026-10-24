import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userDocRef = doc(db, "users", session.user.email);
    
    // Clear Google Cloud fields using deleteField()
    await updateDoc(userDocRef, {
      gcpLinkedEmail: deleteField(),
      gcpAccessToken: deleteField(),
      gcpRefreshToken: deleteField(),
      gcpTokenExpiry: deleteField(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Google Cloud disconnected successfully." });
  } catch (err: any) {
    console.error("Failed to disconnect GCP:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
