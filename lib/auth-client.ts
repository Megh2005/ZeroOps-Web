import { signOut } from "next-auth/react";

export const logout = async () => {
  try {
    await signOut({ callbackUrl: "/" });
  } catch (error) {
    console.error("Error signing out with NextAuth", error);
    throw error;
  }
};

export const saveUserProfile = async (uid: string, data: any): Promise<any> => {
  try {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to save user profile: Status ${res.status}`);
    }
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to save profile");
    }
    return result.profile;
  } catch (error) {
    console.error("Error saving user profile", error);
    throw error;
  }
};
