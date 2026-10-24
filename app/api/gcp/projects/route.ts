import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getFreshGcpToken } from "@/lib/gcp";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getFreshGcpToken(session.user.email);

    // Call Cloud Resource Manager API to list projects
    const projectsResponse = await fetch("https://cloudresourcemanager.googleapis.com/v1/projects", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!projectsResponse.ok) {
      const errText = await projectsResponse.text();
      // If resource manager API is not enabled or returns permission issues
      if (projectsResponse.status === 403) {
        return NextResponse.json({ 
          error: "Permission Denied. Please enable the 'Cloud Resource Manager API' in your Google Cloud Console.",
          status: 403
        }, { status: 403 });
      }
      throw new Error(`Failed to list projects: ${errText}`);
    }

    const data = await projectsResponse.json();
    const projectsList = (data.projects || []).map((p: any) => ({
      projectId: p.projectId,
      name: p.name,
      projectNumber: p.projectNumber,
      lifecycleState: p.lifecycleState,
    })).filter((p: any) => p.lifecycleState === "ACTIVE");

    return NextResponse.json({ projects: projectsList });
  } catch (err: any) {
    console.error("GCP projects fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
