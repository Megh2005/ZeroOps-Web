import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID is not configured in .env" }, { status: 500 });
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

  // Scopes requested: cloud-platform to allow resource configuration
  const scopes = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/cloud-platform"
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
