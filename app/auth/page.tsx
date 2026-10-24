"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { Button } from "@/components/ui/button";
import { FiLoader, FiCheckCircle, FiKey } from "react-icons/fi";
import { FaGithub } from "react-icons/fa6";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";

  useEffect(() => {
    if (user) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      const redirect = setTimeout(() => {
        router.push("/");
      }, 3000);

      return () => {
        clearInterval(timer);
        clearTimeout(redirect);
      };
    }
  }, [user, router]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("github", { callbackUrl: "/profile" });
    } catch (error) {
      console.error("Sign in failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 selection:bg-blue-500/30 flex items-center justify-center p-4 pb-28 relative overflow-hidden">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-8 shadow-2xl backdrop-blur-2xl">
          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="authenticated"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center"
              >
                <div className="mb-6 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                </div>
                <h1 className="text-xl font-semibold  text-zinc-100 mb-2">
                  Authentication Verified
                </h1>
                <p className="text-zinc-400 text-xs mb-6">
                  Session established for <br />
                  <span className="text-zinc-200 font-mono mt-1 block">
                    {user.email}
                  </span>
                </p>
                <div className="w-full bg-zinc-800/50 rounded-full h-1 mb-4 overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3, ease: "linear" }}
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Redirecting in {countdown}s...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-300 shadow-sm">
                    <FiKey className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-xl font-semibold  text-zinc-100 mb-2">
                    Secure Access
                  </h1>
                  <p className="text-zinc-500 text-xs">
                    Authenticate to access infrastructure canvas
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 text-sm font-semibold"
                >
                  {isLoading ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center gap-2.5">
                      <FaGithub className="w-4 h-4" />
                      Connect with GitHub
                    </div>
                  )}
                </Button>

                <p className="mt-6 text-center text-[10px] text-zinc-600 font-mono">
                  Access requires organizational provisioning. <br />
                  Subject to Enterprise Terms.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
