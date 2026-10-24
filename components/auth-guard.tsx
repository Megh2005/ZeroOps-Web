"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { FiLoader } from "react-icons/fi";

const PUBLIC_PATHS = [
  "/",
  "/auth",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not logged in and trying to access a protected route
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push("/auth");
        }
      } else {
        // If logged in and on the auth page, redirect directly to profile
        if (pathname === "/auth") {
          router.push("/profile");
        }
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
        <FiLoader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // While determining redirection, show nothing to avoid flash of content
  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }
  if (user && pathname === "/auth") {
    return null;
  }

  return <>{children}</>;
}
