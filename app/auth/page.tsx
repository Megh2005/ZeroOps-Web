"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, KeyRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

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
      await signIn("github", { callbackUrl: "/onboarding" });
    } catch (error) {
      console.error("Sign in failed", error);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-transparent text-zinc-100 selection:bg-blue-500/30 flex items-center justify-center p-4">
      <SiteHeader />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm mt-16"
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Authentication Verified</h1>
                <p className="text-zinc-400 text-xs mb-6">
                  Session established for <br />
                  <span className="text-zinc-200 font-mono mt-1 block">{user.email}</span>
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 shadow-sm">
                    <KeyRound className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mb-2">Secure Access</h1>
                  <p className="text-zinc-500 text-xs">
                    Authenticate to access infrastructure canvas
                  </p>
                </div>

                <Button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 rounded border border-zinc-800 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition-all relative overflow-hidden"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  ) : (
                    <div className="flex items-center justify-center gap-3 relative z-10">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      Connect with GitHub
                    </div>
                  )}
                </Button>

                <p className="mt-6 text-center text-[10px] text-zinc-600 font-mono">
                  Access requires organizational provisioning. <br/>
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
