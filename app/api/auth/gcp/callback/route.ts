import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized. Please log in with GitHub first." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/profile?gcp_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/profile?gcp_error=missing_code", req.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.json({ error: "Google Client ID or Client Secret not configured in .env" }, { status: 500 });
  }

  // Determine redirect URI. Default to localhost dev port, or fallback to NEXTAUTH_URL.
  let redirectUri = "http://localhost:3000/api/auth/gcp/callback";
  if (process.env.NEXTAUTH_URL) {
    redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/gcp/callback`;
  } else {
    // Dynamically fallback based on request host
    try {
      const url = new URL(req.url);
      redirectUri = `${url.protocol}//${url.host}/api/auth/gcp/callback`;
    } catch (e) {}
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Failed Google Token exchange:", errText);
      return NextResponse.redirect(new URL(`/profile?gcp_error=token_exchange_failed`, req.url));
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Fetch user details from Google to identify the linked email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let gcpLinkedEmail = "";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      gcpLinkedEmail = userInfo.email || "";
    }

    // Save tokens inside Firestore user document
    const userDocRef = doc(db, "users", session.user.email);
    await updateDoc(userDocRef, {
      gcpLinkedEmail,
      gcpAccessToken: access_token,
      // Google only returns refresh_token on initial consent. Save it if provided.
      ...(refresh_token ? { gcpRefreshToken: refresh_token } : {}),
      gcpTokenExpiry: new Date(Date.now() + (expires_in * 1000)).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL("/profile?gcp_success=true", req.url));
  } catch (err: any) {
    console.error("GCP OAuth callback error:", err);
    return NextResponse.redirect(new URL(`/profile?gcp_error=${encodeURIComponent(err.message)}`, req.url));
  }
}
