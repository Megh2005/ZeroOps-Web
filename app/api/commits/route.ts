import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const commitsRef = collection(db, "commits");
    const q = query(commitsRef, where("userEmail", "==", session.user.email));
    const querySnapshot = await getDocs(q);

    const commitsList: any[] = [];
    querySnapshot.forEach((doc) => {
      commitsList.push({ id: doc.id, ...doc.data() });
    });

    // Sort in memory to avoid the need for composite indexes in Firestore
    commitsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ success: true, commits: commitsList });
  } catch (error: any) {
    console.error("Error fetching commits:", error);
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

    const commitRef = doc(db, "commits", commitId);
    const commitSnap = await getDoc(commitRef);
    if (!commitSnap.exists()) {
      return NextResponse.json({ success: false, error: "Commit record not found" }, { status: 404 });
    }

    const commitData = commitSnap.data();
    if (commitData.userEmail !== session.user.email) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await deleteDoc(commitRef);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting commit log:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
