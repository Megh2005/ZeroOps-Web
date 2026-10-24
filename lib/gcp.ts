import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getFreshGcpToken(userEmail: string): Promise<string> {
  const userDocRef = doc(db, "users", userEmail);
  const userSnap = await getDoc(userDocRef);
  
  if (!userSnap.exists()) {
    throw new Error("User record not found in database.");
  }

  const userData = userSnap.data();
  const { gcpAccessToken, gcpRefreshToken, gcpTokenExpiry } = userData;

  if (!gcpAccessToken) {
    throw new Error("Google Cloud is not connected. Please link your account first.");
  }

  // Check if token is expired or expires in the next 60 seconds
  const isExpired = !gcpTokenExpiry || new Date(gcpTokenExpiry).getTime() - 60000 < Date.now();

  if (!isExpired) {
    return gcpAccessToken;
  }

  // If expired, attempt to refresh
  if (!gcpRefreshToken) {
    throw new Error("GCP connection expired. Please reconnect your Google Cloud account.");
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    throw new Error("OAuth Client variables are not configured in system environment.");
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: gcpRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Google token: ${await response.text()}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in;

    // Save updated token inside Firestore
    await updateDoc(userDocRef, {
      gcpAccessToken: newAccessToken,
      gcpTokenExpiry: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return newAccessToken;
  } catch (err: any) {
    console.error("Error refreshing GCP token:", err);
    throw new Error(`GCP token refresh failed: ${err.message}`);
  }
}
