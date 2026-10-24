"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import {
  Search,
  GitCommit,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CommitLog {
  id: string;
  sha: string;
  userEmail: string;
  repoId: string;
  repoName: string;
  branch: string;
  path: string;
  action: "create" | "update" | "delete";
  message: string;
  content: string | null;
  previousContent: string | null;
  previousSha: string | null;
  shaAfter: string | null;
  timestamp: string;
}

export default function CommitsPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [commits, setCommits] = useState<CommitLog[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCommits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/commits");
      const data = await res.json();
      if (data.success) {
        setCommits(data.commits || []);
      } else {
        toast.error(data.error || "Failed to load commits history");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading commits history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, []);

  const handleRevert = async (commitId: string) => {
    if (revertingId) return;

    const confirmRevert = window.confirm(
      "Are you sure you want to revert this commit on GitHub? This will push a reverting commit or restore the file back to its previous state.",
    );
    if (!confirmRevert) return;

    setRevertingId(commitId);
    const toastId = toast.loading("Reverting commit on GitHub...");
    try {
      const res = await fetch("/api/commits/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          "Successfully reverted commit and restored repository state!",
          { id: toastId },
        );
        setCommits((prev) => prev.filter((c) => c.id !== commitId));
      } else {
        toast.error(data.error || "Failed to revert commit", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while reverting", { id: toastId });
    } finally {
      setRevertingId(null);
    }
  };

  const handleDeleteLog = async (commitId: string) => {
    if (deletingId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this commit log from your ledger? This will not affect the commit on GitHub, only clear the log here.",
    );
    if (!confirmDelete) return;

    setDeletingId(commitId);
    try {
      const res = await fetch(`/api/commits?id=${commitId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Commit log cleared from ledger");
        setCommits((prev) => prev.filter((c) => c.id !== commitId));
      } else {
        toast.error(data.error || "Failed to delete commit log");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting the log");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCommits = commits.filter((c) => {
    const matchesSearch =
      (c.message || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.repoName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.path || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.sha || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter = actionFilter === "all" || c.action === actionFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Global Background Grid */}
      <div className="fixed inset-0 z-0 h-full w-full pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-[0.08] blur-[100px]"></div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-10 pb-32 flex flex-col gap-6 relative z-10">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold  text-zinc-100 flex items-center gap-2.5">
              <GitCommit className="w-8 h-8 text-blue-500" /> Commit Ledger
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Track, review, or roll back code pushed directly to GitHub.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCommits}
            disabled={loading}
            className="self-start md:self-auto gap-2 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh List
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search by repo, message, file path or SHA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/80 border-zinc-800/80 focus:border-zinc-700 text-sm h-10 rounded-xl"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-start sm:justify-end">
            {["all", "create", "update", "delete"].map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                  actionFilter === act
                    ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                    : "bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Commits List */}
        {loading ? (
          <div className="flex-1 min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-zinc-500 text-sm font-mono">
              Retrieving commit history...
            </span>
          </div>
        ) : filteredCommits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredCommits.map((c) => {
                const dateStr = new Date(c.timestamp).toLocaleString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-855 backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-800 transition-all shadow-md group"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          c.action === "create"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : c.action === "update"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors truncate">
                            {c.repoName}
                          </span>
                          <span className="text-zinc-650 text-xs font-mono">
                            •
                          </span>
                          <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-semibold">
                            {c.branch}
                          </span>
                          <span className="text-zinc-650 text-xs font-mono">
                            •
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              c.action === "create"
                                ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                                : c.action === "update"
                                  ? "bg-blue-950/40 border-blue-500/20 text-blue-400"
                                  : "bg-rose-950/40 border-rose-500/20 text-rose-400"
                            }`}
                          >
                            {c.action}
                          </span>
                        </div>

                        <h3
                          className="text-sm font-semibold text-zinc-200 leading-snug truncate group-hover:text-white transition-colors"
                          title={c.message}
                        >
                          {c.message}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {dateStr}
                          </span>
                          <span>•</span>
                          <span>
                            Path:{" "}
                            <code className="text-zinc-400 text-[11px] bg-zinc-900/60 px-1 py-0.5 rounded">
                              {c.path}
                            </code>
                          </span>
                          <span>•</span>
                          <span>
                            SHA:{" "}
                            <code className="text-zinc-400 text-[11px] bg-zinc-900/60 px-1 py-0.5 rounded">
                              {c.sha.slice(0, 7)}
                            </code>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end border-t border-zinc-900 pt-3 md:pt-0 md:border-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevert(c.id)}
                        disabled={revertingId === c.id || deletingId === c.id}
                        className="flex-1 md:flex-initial h-8 gap-1.5 border-blue-500/20 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 bg-transparent text-[11px] font-semibold"
                      >
                        {revertingId === c.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Reverting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Revert Commit
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLog(c.id)}
                        disabled={revertingId === c.id || deletingId === c.id}
                        className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1 min-h-[40vh] border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-zinc-950/10">
            <AlertCircle className="w-10 h-10 text-zinc-600 mb-3" />
            <h3 className="text-zinc-300 font-semibold mb-1 text-sm">
              No commits found
            </h3>
            <p className="text-zinc-500 text-xs max-w-sm">
              {search || actionFilter !== "all"
                ? "No logged commits match your current filters or search query."
                : "Pushes and file updates made in the application will show up here so you can trace or revert them."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
