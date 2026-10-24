"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const userEmail = session?.user?.email;

  useEffect(() => {
    if (userEmail) {
      setProfileLoading(true);
      fetch("/api/user/profile")
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errorMsg = errData.error || `Failed to fetch profile: Status ${res.status}`;
            if (res.status === 404 || errorMsg === "User not found") {
              const { signOut } = await import("next-auth/react");
              signOut({ callbackUrl: "/auth" });
            }
            throw new Error(errorMsg);
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success && data?.profile) {
            setProfile(data.profile);
          } else {
            setProfile(null);
          }
        })
        .catch((error) => {
          console.error("Error in profile fetch:", error);
          setProfile(null);
        })
        .finally(() => {
          setProfileLoading(false);
        });
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [userEmail]);

  const loading = status === "loading" || (!!session?.user && profileLoading);

  // Normalize user object so it has the fields the app expects (uid, displayName, photoURL)
  const normalizedUser = session?.user
    ? {
        ...session.user,
        uid: (session.user as any).githubId || session.user.email,
        displayName: session.user.name,
        photoURL: session.user.image,
      }
    : null;

  return (
    <AuthContext.Provider value={{ user: normalizedUser, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

