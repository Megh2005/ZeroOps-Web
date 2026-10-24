"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const redirectHandler = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  const color = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";

  return (
    <div className="bg-background relative flex h-screen w-full items-center justify-center overflow-hidden border">
      <Floating3DParticles color={color} />

      <div className="relative z-10 flex flex-col items-center gap-8 md:gap-10 px-6 text-center">
        <h2 className="text-4xl font-extrabold sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="text-white">ZeroOps</span>
        </h2>

        <Button
          size="lg"
          onClick={redirectHandler}
          className="h-12 px-8 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}
