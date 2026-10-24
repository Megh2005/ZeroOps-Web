"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { toast } from "sonner";
import {
  Loader2,
  User,
  Mail,
  Hash,
  Briefcase,
  Users,
  Layers,
  Shield,
  Activity,
  Cpu,
  Server,
  CheckCircle2,
  Network,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  Zap,
  Github,
  Search,
  RefreshCw,
  Star,
  GitFork,
  Tag,
  FolderGit2,
  Plus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TEAM_SIZE_MAP: Record<string, string> = {
  "1": "Solo Workspace (1 member)",
  "2-10": "Small Squad (2-10 members)",
  "11-50": "Mid-Market / Growth (11-50 members)",
  "51-200": "Enterprise Segment (51-200 members)",
  "200+": "Global Enterprise Core (200+ members)",
};

const FIELD_MAP: Record<string, string> = {
  "web-dev": "Web Engineering",
  "mobile-dev": "Mobile App Development",
  "data-science": "Artificial Intelligence & Data Systems",
  design: "Creative & Interface Design",
  marketing: "Growth & Analytics Engineering",
  student: "Academic & Computer Science",
  other: "Custom Domain Focus",
};

const USE_CASE_MAP: Record<string, string> = {
  personal: "Personal Projects",
  freelance: "Freelance / Agency Operations",
  startup: "Startup / SaaS Development",
  enterprise: "Enterprise Systems Integration",
  education: "Academic & Training Labs",
  other: "Custom Business Settings",
};

const LANGUAGE_COLOR_MAP: Record<string, string> = {
  TypeScript: "bg-blue-500 text-blue-100 border-blue-500/20",
  JavaScript: "bg-yellow-500 text-yellow-950 border-yellow-500/20",
  Python: "bg-emerald-500 text-emerald-100 border-emerald-500/20",
  Go: "bg-cyan-500 text-cyan-100 border-cyan-500/20",
  Rust: "bg-orange-600 text-orange-100 border-orange-600/20",
  HTML: "bg-rose-500 text-rose-100 border-rose-500/20",
  CSS: "bg-indigo-500 text-indigo-100 border-indigo-500/20",
  Ruby: "bg-red-500 text-red-100 border-red-500/20",
  Java: "bg-amber-600 text-amber-100 border-amber-600/20",
  C: "bg-zinc-500 text-zinc-100 border-zinc-500/20",
  "C++": "bg-pink-600 text-pink-100 border-pink-600/20",
  "C#": "bg-purple-600 text-purple-100 border-purple-600/20",
  PHP: "bg-indigo-400 text-indigo-950 border-indigo-400/20",
  Shell: "bg-green-600 text-green-100 border-green-600/20",
  Swift: "bg-orange-500 text-orange-100 border-orange-500/20",
  Kotlin: "bg-violet-500 text-violet-100 border-violet-500/20",
};

interface BlueprintItem {
  title: string;
  description: string;
  command: string;
  docsUrl: string;
}

const STARTER_BLUEPRINTS: Record<string, BlueprintItem[]> = {
  "web-dev": [
    {
      title: "ZeroOps React Next.js Pipeline Scaffolding",
      description:
        "Automated Docker containerization logic configuration optimized for Next.js App Router.",
      command: "npx zeroops init --template=nextjs",
      docsUrl: "/docs/nextjs",
    },
    {
      title: "ZeroOps Node.js Express Backend Service",
      description:
        "Docker Compose manifest with multi-stage builds, reverse proxies, and database services.",
      command: "npx zeroops init --template=express-mongo",
      docsUrl: "/docs/express",
    },
  ],
  "mobile-dev": [
    {
      title: "ZeroOps React Native Android/iOS Deployment",
      description:
        "Cloud-native EAS configuration templates for automated builds and push notifications.",
      command: "npx zeroops init --template=react-native",
      docsUrl: "/docs/react-native",
    },
    {
      title: "ZeroOps Flutter Mobile App Engine",
      description:
        "CI/CD configurations linking Flutter pipelines directly to AWS AppRunner instances.",
      command: "npx zeroops init --template=flutter",
      docsUrl: "/docs/flutter",
    },
  ],
  "data-science": [
    {
      title: "ZeroOps Python PyTorch GPU Cluster",
      description:
        "Docker containers prepared for NVIDIA GPU allocation, Jupyter Notebook server, and data mounts.",
      command: "npx zeroops init --template=pytorch-gpu",
      docsUrl: "/docs/pytorch",
    },
    {
      title: "ZeroOps PostgreSQL & pgvector Database",
      description:
        "Production Vector database environment prepared for LLM embeddings storage and query validation.",
      command: "npx zeroops init --template=postgres-vector",
      docsUrl: "/docs/postgres-vector",
    },
  ],
  design: [
    {
      title: "ZeroOps Tailwind UI Design Package",
      description:
        "Pre-configured templates containing storybook instances, design system tokens, and canvas preview adapters.",
      command: "npx zeroops init --template=design-system",
      docsUrl: "/docs/design-system",
    },
    {
      title: "ZeroOps Static Preview CDN Deployer",
      description:
        "Automated actions routing local design directories directly to cloud edge workers for reviews.",
      command: "npx zeroops init --template=static-edge",
      docsUrl: "/docs/static-edge",
    },
  ],
  marketing: [
    {
      title: "ZeroOps Google Tag Manager & GA4 Container",
      description:
        "Pre-assembled configuration parameters mapping analytical events to secure databases.",
      command: "npx zeroops init --template=analytics-core",
      docsUrl: "/docs/analytics",
    },
    {
      title: "ZeroOps Landing Page SEO Scaffold",
      description:
        "Static landing page optimized for high-performance PageSpeed indicators and CDN caching.",
      command: "npx zeroops init --template=seo-landing",
      docsUrl: "/docs/seo-landing",
    },
  ],
  student: [
    {
      title: "ZeroOps Basic Web Sandbox Stack",
      description:
        "Simple boilerplate hosting HTML/CSS/JS nodes inside safe playground containers.",
      command: "npx zeroops init --template=student-sandbox",
      docsUrl: "/docs/sandbox",
    },
    {
      title: "ZeroOps Basic Python API Server",
      description:
        "Muted backend service template deploying simple JSON responses for classroom verification.",
      command: "npx zeroops init --template=student-python",
      docsUrl: "/docs/student-python",
    },
  ],
  other: [
    {
      title: "ZeroOps General CI/CD Scaffolding",
      description:
        "Universal GitHub Actions pipelines designed to build and deploy Docker workspaces.",
      command: "cat zeroops.yml",
      docsUrl: "/docs/devops-ci",
    },
    {
      title: "Docker Compose Workspace Package",
      description:
        "Container orchestration linking reverse proxies, relational databases, and caching layers.",
      command: "docker-compose -f workspace.yml up -d",
      docsUrl: "/docs/docker",
    },
  ],
};

export default function DashboardPage() {
  const { user, profile: dbProfile, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";

  const profile = dbProfile || {
    displayName: user?.displayName || "DevOps Developer",
    email: user?.email || "",
    username: user?.email?.split("@")[0] || "user",
    useCase: "individual",
    teamSize: "1",
    fieldOfWork: "other",
    photoURL: user?.photoURL || "",
    repositories: [],
  };

  const [imageError, setImageError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [cpuValue, setCpuValue] = useState(2.4);
  const [ramValue, setRamValue] = useState(8.2);
  const [networkLatency, setNetworkLatency] = useState(14);
  const [activeNotification, setActiveNotification] = useState<string | null>(
    null,
  );

  // Tab State
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "repositories"

  // Repositories State
  const [repositories, setRepositories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      toast.error("Repository name is required.");
      return;
    }
    setCreatingRepo(true);
    const toastId = toast.loading(`Creating repository ${newRepoName}...`);
    try {
      const res = await fetch("/api/repos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepoName,
          description: newRepoDesc,
          private: newRepoPrivate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Repository created successfully!`, { id: toastId });
        setIsCreateModalOpen(false);
        setNewRepoName("");
        setNewRepoDesc("");
        setNewRepoPrivate(false);
        setRepositories((prev) => [data.repository, ...prev]);
      } else {
        toast.error(data.error || "Failed to create repository.", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during repository creation.", {
        id: toastId,
      });
    } finally {
      setCreatingRepo(false);
    }
  };

  useEffect(() => {
    if (dbProfile?.repositories) {
      setRepositories(dbProfile.repositories);
    }
  }, [dbProfile]);

  // Live Breathing Resource Metrics & History Graph queue
  const [systemHistory, setSystemHistory] = useState<
    Array<{ time: string; cpu: number; ram: number }>
  >([
    { time: "10s ago", cpu: 2.1, ram: 7.8 },
    { time: "9s ago", cpu: 2.4, ram: 7.9 },
    { time: "8s ago", cpu: 3.2, ram: 8.0 },
    { time: "7s ago", cpu: 2.5, ram: 8.1 },
    { time: "6s ago", cpu: 2.1, ram: 8.0 },
    { time: "5s ago", cpu: 2.6, ram: 8.3 },
    { time: "4s ago", cpu: 2.3, ram: 8.2 },
    { time: "3s ago", cpu: 2.4, ram: 8.2 },
    { time: "2s ago", cpu: 2.7, ram: 8.5 },
    { time: "1s ago", cpu: 2.5, ram: 8.4 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextCpu = Number((1.5 + Math.random() * 2.5).toFixed(2));
      const nextRam = Number((7.0 + Math.random() * 2.0).toFixed(2));
      setCpuValue(nextCpu);
      setRamValue(nextRam);
      setNetworkLatency(Math.floor(12 + Math.random() * 5));

      setSystemHistory((prev) => {
        const updated = [
          ...prev.slice(1),
          { time: "Now", cpu: nextCpu, ram: nextRam },
        ];
        // Re-label history for visual consistency
        return updated.map((item, idx) => {
          if (idx === updated.length - 1) return { ...item, time: "Now" };
          return { ...item, time: `${updated.length - 1 - idx}s ago` };
        });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncRepos = async () => {
    setSyncing(true);
    const toastId = toast.loading(
      "Synchronizing latest repositories from GitHub...",
    );
    try {
      const res = await fetch("/api/user/sync-repos", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setRepositories(data.repositories);
        toast.success("GitHub repository register updated successfully!", {
          id: toastId,
        });
      } else {
        toast.error(data.error || "Failed to sync repositories.", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while syncing repositories.", {
        id: toastId,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!user && !loading) return null;

  const blueprints =
    STARTER_BLUEPRINTS[profile.fieldOfWork] || STARTER_BLUEPRINTS["other"];

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);

    setActiveNotification(`Command claimed. Copied to clipboard!`);
    setTimeout(() => setActiveNotification(null), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  } as const;

  // Extract unique languages present in repos
  const uniqueLanguages = Array.from(
    new Set(repositories.map((r) => r.language).filter(Boolean)),
  ) as string[];

  // Filter repos based on search and language dropdown
  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLanguage =
      selectedLanguage === "all" || repo.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  // Fetch top 5 repositories based on creation date (newest first)
  const top5Repos = [...repositories]
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const valA = isNaN(timeA) ? 0 : timeA;
      const valB = isNaN(timeB) ? 0 : timeB;
      return valB - valA; // Newest created first
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 select-none relative overflow-hidden">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Muted Premium Grid Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#141416_1px,transparent_1px),linear-gradient(to_bottom,#141416_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>

      {/* Active notification bubble */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -40, x: "-50%" }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-blue-500 border border-blue-400 text-white font-mono text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{activeNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-[80vw] mx-auto pt-10 pb-32 space-y-6">
        {/* Classy SaaS Header Section */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-900/10 border border-zinc-800/80 p-6 md:p-8 rounded-2xl backdrop-blur-2xl relative overflow-hidden"
        >
          <div className="flex items-center gap-5 relative z-10 w-full justify-between flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-14 w-14 border border-zinc-800 relative bg-zinc-900 flex items-center justify-center">
                  {!imageError && profile.photoURL ? (
                    <AvatarImage
                      src={profile.photoURL}
                      alt={profile.displayName}
                      onError={() => setImageError(true)}
                    />
                  ) : null}
                  <AvatarFallback className="bg-zinc-900 text-zinc-300 text-base font-bold font-mono">
                    {profile.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-[#09090b]" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold text-white/95">
                    {profile.displayName || "DevOps Developer"}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                    Developer Pro
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>{profile.email}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-6 text-[10px] font-mono bg-zinc-950/40 border border-zinc-800/60 p-2.5 rounded-xl px-4">
              <div className="space-y-0.5">
                <span className="text-zinc-500 block uppercase tracking-wider text-[8px]">
                  Cloud Region
                </span>
                <span className="text-zinc-300 font-semibold uppercase">
                  US-EAST-1
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div className="space-y-0.5">
                <span className="text-zinc-500 block uppercase tracking-wider text-[8px]">
                  Cluster IP
                </span>
                <span className="text-zinc-300 font-semibold font-mono">
                  10.124.0.5
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div className="space-y-0.5">
                <span className="text-zinc-500 block uppercase tracking-wider text-[8px]">
                  Verification
                </span>
                <span className="text-emerald-400 font-semibold uppercase flex items-center gap-1">
                  Verified
                </span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Tab Selection */}
        <div className="flex gap-6 border-b border-zinc-800/60 pb-3 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 px-1 text-sm font-semibold transition-all relative ${
              activeTab === "overview"
                ? "text-blue-400 font-bold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Workspace Overview
            {activeTab === "overview" && (
              <motion.div
                layoutId="dashboardTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("repositories")}
            className={`pb-2 px-1 text-sm font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === "repositories"
                ? "text-blue-400 font-bold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            GitHub Repositories
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
              {repositories.length}
            </span>
            {activeTab === "repositories" && (
              <motion.div
                layoutId="dashboardTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" ? (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Profile Details & Cluster Stats Section */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Card 1: Identity & Security Profile */}
                <motion.div variants={itemVariants} className="md:col-span-6">
                  <Card className="h-full bg-zinc-900/10 border-zinc-800/80 backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between p-5 rounded-2xl shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-zinc-400">
                          <Shield className="w-3.5 h-3.5 text-zinc-500" />
                          Identity Core
                        </CardTitle>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                            Account Handle
                          </label>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200">
                            <Hash className="w-3.5 h-3.5 text-zinc-600" />@
                            {profile.username}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                            Verification Node
                          </label>
                          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200">
                            <Mail className="w-3.5 h-3.5 text-zinc-600" />
                            {profile.email}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                            Access Rights
                          </label>
                          <div className="text-xs font-mono text-zinc-400">
                            Authorized Root Administrator
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800/50 mt-4 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                      <span>Ref: zeroops-profile-v2</span>
                      <HelpCircle className="w-3 h-3 text-zinc-600" />
                    </div>
                  </Card>
                </motion.div>

                {/* Card 2: Environment Settings summary */}
                <motion.div variants={itemVariants} className="md:col-span-6">
                  <Card className="h-full bg-zinc-900/10 border-zinc-800/80 backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between p-5 rounded-2xl shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-zinc-400">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                          Workspace Profile
                        </CardTitle>
                      </div>
                      <div className="bg-zinc-950/20 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/60 p-0.5">
                        <div className="flex justify-between items-center py-2 px-3 text-[10px] font-mono">
                          <span className="text-zinc-500">Workspace Type</span>
                          <span
                            className="text-zinc-200 font-medium capitalize max-w-[120px] truncate"
                            title={profile.useCase}
                          >
                            {USE_CASE_MAP[profile.useCase] || profile.useCase}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 text-[10px] font-mono">
                          <span className="text-zinc-500">
                            Collaborator Scale
                          </span>
                          <span
                            className="text-zinc-200 font-medium capitalize max-w-[120px] truncate"
                            title={profile.teamSize}
                          >
                            {TEAM_SIZE_MAP[profile.teamSize] ||
                              profile.teamSize}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 text-[10px] font-mono">
                          <span className="text-zinc-500">Tech Stack Core</span>
                          <span
                            className="text-zinc-200 font-medium capitalize max-w-[120px] truncate"
                            title={profile.fieldOfWork}
                          >
                            {FIELD_MAP[profile.fieldOfWork] ||
                              profile.fieldOfWork?.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800/50 mt-4 text-[9px] text-zinc-500 font-mono">
                      Parameters synced from provisioning.
                    </div>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Real-time Compute & Memory Split Analytics Graphs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="bg-zinc-900/10 border border-zinc-800/80 p-5 rounded-2xl backdrop-blur-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                        Processor Diagnostics
                      </span>
                      <h3 className="text-sm font-semibold text-white ">
                        vCPU Frequency Load
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-blue-500 font-bold">
                          {cpuValue} GHz
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="h-[250px] min-h-[250px] w-full mt-4 font-mono text-[10px]">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={systemHistory}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="cpuGlow"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="#52525b"
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 5]}
                          stroke="#52525b"
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val} GHz`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#09090b",
                            borderColor: "#27272a",
                            fontSize: "9px",
                            fontFamily: "monospace",
                            color: "#fff",
                            borderRadius: "8px",
                          }}
                          labelClassName="text-zinc-500 font-bold"
                        />
                        <Area
                          type="linear"
                          dataKey="cpu"
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#cpuGlow)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="bg-zinc-900/10 border border-zinc-800/80 p-5 rounded-2xl backdrop-blur-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                        Memory Diagnostics
                      </span>
                      <h3 className="text-sm font-semibold text-white ">
                        RAM Block Allocation
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-500 font-bold">
                          {ramValue} GB
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="h-[250px] min-h-[250px] w-full mt-4 font-mono text-[10px]">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={systemHistory}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="ramGlow"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="#52525b"
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 16]}
                          stroke="#52525b"
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val} GB`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#09090b",
                            borderColor: "#27272a",
                            fontSize: "9px",
                            fontFamily: "monospace",
                            color: "#fff",
                            borderRadius: "8px",
                          }}
                          labelClassName="text-zinc-500 font-bold"
                        />
                        <Area
                          type="step"
                          dataKey="ram"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#ramGlow)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Section 3: Tech Starters & Blueprints tailored to their choice */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">
                    Provision Tech Stack Starter Blueprints
                  </span>
                  <p className="text-zinc-400 text-xs">
                    Based on your selection of{" "}
                    <span className="text-blue-500 font-semibold">
                      {FIELD_MAP[profile.fieldOfWork] || profile.fieldOfWork}
                    </span>
                    , the following starter packages are ready.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {blueprints.map((item, idx) => (
                    <Card
                      key={idx}
                      className="bg-zinc-900/10 border-zinc-800/80 p-5 rounded-2xl hover:border-blue-500/50 hover:bg-zinc-900/20 transition-all duration-300 flex flex-col justify-between gap-6"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <h3 className="text-xs font-semibold text-white  flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-blue-500" />
                            {item.title}
                          </h3>
                          <span className="text-[8px] font-mono uppercase text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-950 font-bold">
                            Starter Kit
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          {item.description}
                        </p>

                        {/* Copyable Terminal Command Block */}
                        <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between font-mono text-[10px] text-zinc-300">
                          <span className="truncate pr-3">{item.command}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyToClipboard(item.command, idx)
                            }
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                            title="Copy claim command"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-800/50 pt-3 text-[10px] font-mono">
                        <span className="text-zinc-500">Ready to execute.</span>
                        <a
                          href={item.docsUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveNotification(
                              `Documentation details claimed! Link: ${item.docsUrl}`,
                            );
                            setTimeout(() => setActiveNotification(null), 3000);
                          }}
                          className="text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                        >
                          <span>Read Docs</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="repos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* TOP 5 REPOS BY CREATION DATE */}
              <div className="bg-zinc-900/10 border border-zinc-800/80 p-6 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-6">
                  <h3 className="text-sm font-mono tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    Top 5 Recently Created Repositories
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      First by Creation Date
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="font-mono text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Repo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncRepos}
                      disabled={syncing}
                      className="font-mono text-xs gap-1.5"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`}
                      />
                      Sync Repos
                    </Button>
                  </div>
                </div>

                {top5Repos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {top5Repos.map((repo) => (
                      <div
                        key={`top-${repo.id}`}
                        className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/2 p-5 hover:bg-blue-500/4 transition-all duration-300 flex flex-col justify-between hover:border-blue-500/40 shadow-[0_2px_12px_rgba(59,130,246,0.03)]"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1 truncate pr-1">
                              <Link href={`/repos/${repo.id}`}>
                                <h4
                                  className="text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors truncate"
                                  title={repo.name}
                                >
                                  {repo.name}
                                </h4>
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest border",
                                    repo.private
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : "bg-zinc-800 text-zinc-400 border-zinc-700/60",
                                  )}
                                >
                                  {repo.private ? "Private" : "Public"}
                                </span>
                              </div>
                            </div>
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 h-8">
                            {repo.description || (
                              <span className="italic text-zinc-700">
                                No description provided.
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/40 text-[10px] font-mono text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            {repo.language ? (
                              <>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    LANGUAGE_COLOR_MAP[repo.language]
                                      ? LANGUAGE_COLOR_MAP[repo.language].split(
                                          " ",
                                        )[0]
                                      : "bg-zinc-400"
                                  }`}
                                />
                                <span>{repo.language}</span>
                              </>
                            ) : (
                              <>
                                <Tag className="w-3.5 h-3.5 text-zinc-600" />
                                <span className="text-zinc-600">Untagged</span>
                              </>
                            )}
                          </div>

                          <span className="text-[9px] text-zinc-600 font-mono">
                            Created{" "}
                            {repo.created_at
                              ? new Date(repo.created_at).toLocaleDateString()
                              : "unknown"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                    No repositories available to index by date.
                  </div>
                )}
              </div>

              {/* SEARCHABLE FULL REPOSITORIES REGISTRY */}
              <div className="bg-zinc-900/10 border border-zinc-800/80 p-6 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative">
                {/* Controls Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-800/60 pb-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Github className="w-5 h-5 text-zinc-400" />
                      All Synced Repositories
                    </h3>
                    <p className="text-zinc-500 font-mono text-[10px] tracking-wider uppercase">
                      Displaying {filteredRepos.length} of {repositories.length}{" "}
                      total repositories
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <Input
                        type="text"
                        placeholder="Search repository..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 h-10 bg-zinc-950/40 border-zinc-800 text-white rounded-xl text-xs placeholder:text-zinc-700 focus-visible:ring-zinc-700"
                      />
                    </div>

                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full sm:w-auto px-3.5 h-10 bg-zinc-950/40 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
                    >
                      <option value="all" className="bg-[#09090b]">
                        All Languages
                      </option>
                      {uniqueLanguages.map((lang) => (
                        <option
                          key={lang}
                          value={lang}
                          className="bg-[#09090b]"
                        >
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Repositories Grid */}
                <AnimatePresence mode="popLayout">
                  {filteredRepos.length > 0 ? (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
                      {filteredRepos.map((repo) => (
                        <motion.div
                          key={repo.id}
                          variants={itemVariants}
                          layout
                          className="group relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/20 p-5 hover:bg-zinc-900/20 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between hover:border-blue-500/20 shadow-md"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1 truncate pr-1">
                                <Link href={`/repos/${repo.id}`}>
                                  <h4
                                    className="text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors truncate"
                                    title={repo.name}
                                  >
                                    {repo.name}
                                  </h4>
                                </Link>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest border",
                                      repo.private
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        : "bg-zinc-800 text-zinc-400 border-zinc-700/60",
                                    )}
                                  >
                                    {repo.private ? "Private" : "Public"}
                                  </span>
                                </div>
                              </div>
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 h-8">
                              {repo.description || (
                                <span className="italic text-zinc-700">
                                  No description provided.
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              {repo.language ? (
                                <>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      LANGUAGE_COLOR_MAP[repo.language]
                                        ? LANGUAGE_COLOR_MAP[
                                            repo.language
                                          ].split(" ")[0]
                                        : "bg-zinc-400"
                                    }`}
                                  />
                                  <span>{repo.language}</span>
                                </>
                              ) : (
                                <>
                                  <Tag className="w-3.5 h-3.5 text-zinc-600" />
                                  <span className="text-zinc-600">
                                    Untagged
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                                {repo.stargazers_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                                {repo.forks_count}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-16 text-center"
                    >
                      <div className="inline-flex p-3 rounded-full bg-zinc-900/30 border border-zinc-800/60 text-zinc-600 mb-3">
                        <Github className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-300">
                        No repositories found
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                        Try adjusting your search criteria, selecting a
                        different language, or synchronizing repositories.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Repository Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="border-b border-zinc-800/80 bg-zinc-900/20 px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-mono text-zinc-300 font-bold uppercase tracking-wider">
                  Create New Repository
                </h3>
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-500 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateRepo} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="my-cool-project"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">
                    Description
                  </label>
                  <textarea
                    placeholder="A brief description of your repository"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="w-full min-h-20 p-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Private Repository
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      Control visibility on GitHub
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="h-4 w-4 bg-zinc-900 border-zinc-800 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingRepo || !newRepoName.trim()}
                    className="font-mono text-xs px-4 flex items-center gap-1.5"
                  >
                    {creatingRepo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Create
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
