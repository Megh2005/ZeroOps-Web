import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId query parameter." }, { status: 400 });
  }

  try {
    const deploymentsRef = collection(db, "deployments");
    
    // Query deployments for this user email and project
    const q = query(
      deploymentsRef,
      where("userEmail", "==", session.user.email),
      where("projectId", "==", projectId)
    );

    const snapshot = await getDocs(q);
    const deployments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort client-side to avoid needing custom Firestore indexes for developers initially
    deployments.sort((a: any, b: any) => {
      return new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime();
    });

    return NextResponse.json({ deployments });
  } catch (err: any) {
    console.error("GCP Fetch deployments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
