"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Github,
  ExternalLink,
  Search,
  RefreshCw,
  Star,
  GitFork,
  Mail,
  User as UserIcon,
  Shield,
  Calendar,
  Briefcase,
  Layers,
  Code2,
  HelpCircle,
  FolderGit2,
  Tag,
  AlertCircle,
  Cpu,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { FiGitBranch, FiShield } from "react-icons/fi";



// Map languages to aesthetic colors
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

export default function ProfilePage() {
  const { user, profile: dbProfile, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";

  const profile = dbProfile || {
    displayName: user?.displayName || "GitHub Developer",
    name: user?.displayName || "GitHub Developer",
    email: user?.email || "",
    username: user?.email?.split("@")[0] || "dev",
    githubId: "unknown",
    photoURL: user?.photoURL || "",
    repositories: [],
    createdAt: "",
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "repositories"

  useEffect(() => {
    if (dbProfile?.repositories) {
      setRepositories(dbProfile.repositories);
    }
  }, [dbProfile]);



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

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-zinc-100">
        <AlertCircle className="w-8 h-8 text-rose-500 mb-4" />
        <p className="text-zinc-400 font-mono text-xs mb-4">
          Access Denied. You are not authenticated.
        </p>
      </div>
    );
  }

  // Extract unique languages present in repos
  const uniqueLanguages = Array.from(
    new Set(repositories.map((r) => r.language).filter(Boolean)),
  ) as string[];

  const publicReposCount = repositories.filter((r) => !r.private).length;
  const privateReposCount = repositories.filter((r) => r.private).length;

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      <main className="relative z-10 max-w-[80vw] mx-auto pt-10 pb-32 px-6">
        {/* Header Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6"
        >
          <div>
            <h1 className="text-3xl font-extrabold  text-white flex items-center gap-3">
              <FolderGit2 className="w-8 h-8 text-blue-500" />
              Developer Profile
            </h1>
            <p className="text-zinc-500 font-mono text-xs mt-1">
              Synchronized security node connected to GitHub v3 API
            </p>
          </div>
          <Button
            onClick={handleSyncRepos}
            disabled={syncing}
            variant="outline"
            size="default"
            className="font-mono text-xs gap-2 shrink-0 self-start md:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            Sync GitHub Repos
          </Button>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex gap-6 border-b border-zinc-800/60 pb-3 mb-8">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-2 px-1 text-sm font-semibold transition-all relative ${
              activeTab === "profile"
                ? "text-blue-400 font-bold"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Profile Overview
            {activeTab === "profile" && (
              <motion.div
                layoutId="activeTabUnderline"
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
            Repositories
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
              {repositories.length}
            </span>
            {activeTab === "repositories" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        </div>

        {/* Conditionally Render Tabs */}
        <AnimatePresence mode="wait">
          {activeTab === "profile" ? (
            <motion.div
              key="profile-tab"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* LEFT PANEL: Identity Core Card */}
              <motion.div variants={itemVariants} className="lg:col-span-6">
                <Card className="h-full bg-zinc-900/10 border-zinc-800/80 backdrop-blur-2xl p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-xs font-mono tracking-wider uppercase text-zinc-400">
                        <Shield className="w-4 h-4 text-zinc-500" />
                        Identity Core
                      </CardTitle>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Node
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5 items-center">
                      <div className="relative">
                        <Avatar className="h-20 w-20 border-2 border-blue-500/40 p-1 bg-zinc-950 shadow-inner rounded-full">
                          <AvatarImage
                            src={profile.photoURL || user.photoURL || ""}
                            alt={
                              profile.displayName || user.displayName || "User"
                            }
                            className="rounded-full object-cover"
                          />
                          <AvatarFallback className="bg-zinc-900 text-zinc-300 text-xl font-bold font-mono">
                            {(profile.displayName || user.displayName || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold text-white ">
                          {profile.name ||
                            user.displayName ||
                            "GitHub Developer"}
                        </h2>
                        <p className="text-zinc-500 text-xs font-mono flex items-center justify-center sm:justify-start gap-1">
                          <Github className="w-3.5 h-3.5 inline text-zinc-400" />
                          github.com/{profile.username || "dev"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">
                            Account Handle
                          </label>
                          <div className="text-xs font-mono text-zinc-200">
                            @{profile.username || "not-provisioned"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">
                            GitHub Node ID
                          </label>
                          <div className="text-xs font-mono text-zinc-200">
                            #{profile.githubId || "unknown"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-zinc-800/40 pt-3">
                        <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">
                          Mail Gateway
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                          <Mail className="w-3.5 h-3.5 text-zinc-600" />
                          {profile.email || user.email}
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-zinc-800/40 pt-3 flex items-center gap-2 justify-between">
                        <div>
                          <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">
                            Identity Initialized
                          </label>
                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                            <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                            {profile.createdAt
                              ? new Date(profile.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                              : "Synchronizing..."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-zinc-800/50 mt-6 text-[9px] text-zinc-600 font-mono flex items-center justify-between">
                    <span>Core Token Type: OAuth JWT</span>
                    <HelpCircle className="w-3 h-3 text-zinc-700" />
                  </div>
                </Card>
              </motion.div>

              {/* RIGHT PANEL: Repository & Workspace Overview Card */}
              <motion.div variants={itemVariants} className="lg:col-span-6">
                <Card className="h-full bg-zinc-900/10 border-zinc-800/80 backdrop-blur-2xl p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-xs font-mono tracking-wider uppercase text-zinc-400">
                        <FolderGit2 className="w-4 h-4 text-blue-500" />
                        Repository Telemetry
                      </CardTitle>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {repositories.length} Total
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4 items-center p-3.5 bg-zinc-950/30 border border-zinc-850 rounded-xl">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <FiGitBranch className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              Public Repositories
                            </h4>
                            <p className="text-sm font-semibold text-white mt-0.5">
                              {publicReposCount} Published
                            </p>
                          </div>
                          <span className="text-xs font-mono text-zinc-500">
                            {repositories.length > 0
                              ? Math.round((publicReposCount / repositories.length) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3.5 bg-zinc-950/30 border border-zinc-850 rounded-xl">
                        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          <FiShield className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              Private Repositories
                            </h4>
                            <p className="text-sm font-semibold text-white mt-0.5">
                              {privateReposCount} Secured
                            </p>
                          </div>
                          <span className="text-xs font-mono text-zinc-500">
                            {repositories.length > 0
                              ? Math.round((privateReposCount / repositories.length) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3.5 bg-zinc-950/30 border border-zinc-850 rounded-xl">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Code2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              Languages Indexed
                            </h4>
                            <p className="text-sm font-semibold text-white mt-0.5">
                              {uniqueLanguages.length} Active Stacks
                            </p>
                          </div>
                          <span className="text-xs font-mono text-zinc-500">
                            Multi-Stack
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800/50 mt-6 text-[9px] text-zinc-600 font-mono flex items-center justify-between">
                    <span>Synchronized with GitHub OAuth Token</span>
                    <span className="text-emerald-500 font-bold">Active</span>
                  </div>
                </Card>
              </motion.div>


            </motion.div>
          ) : (
            <motion.div
              key="repos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {/* TOP 5 REPOS BY CREATION DATE */}
              <div className="bg-zinc-900/10 border border-zinc-800/80 p-6 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-6">
                  <h3 className="text-sm font-mono tracking-wider uppercase text-zinc-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    Top 5 Recently Created Repositories
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    First by Creation Date
                  </span>
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
    </div>
  );
}
