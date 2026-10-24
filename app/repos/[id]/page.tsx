"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Floating3DParticles } from "@/components/ui/floating-3d-particles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  ArrowLeft,
  Github,
  Star,
  GitFork,
  ExternalLink,
  Tag,
  BookOpen,
  Calendar,
  AlertCircle,
  Folder,
  FileText,
  GitCommit,
  Code2,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Map languages to aesthetic colors
const LANGUAGE_COLOR_MAP: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-500",
  Python: "bg-emerald-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-600",
  HTML: "bg-rose-500",
  CSS: "bg-indigo-500",
  Ruby: "bg-red-500",
  Java: "bg-amber-600",
  C: "bg-zinc-500",
  "C++": "bg-pink-600",
  "C#": "bg-purple-600",
  PHP: "bg-indigo-400",
  Shell: "bg-green-600",
  Swift: "bg-orange-500",
  Kotlin: "bg-violet-500",
};

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function RepositoryDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<any>(null);
  const [readmeHtml, setReadmeHtml] = useState<string>("");
  const [files, setFiles] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("code"); // "code" or "commits"
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  // CRUD Editing states
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [savingFile, setSavingFile] = useState(false);

  const handleFolderClick = async (dirPath: string) => {
    setLoadingFile(true);
    const toastId = toast.loading(`Opening folder...`);
    try {
      const res = await fetch(
        `/api/repos/${id}?path=${encodeURIComponent(dirPath)}`,
      );
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
        setCurrentPath(dirPath);
        toast.success(`Opened folder`, { id: toastId });
      } else {
        toast.error(data.error || "Failed to load directory contents.", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while opening the folder.", {
        id: toastId,
      });
    } finally {
      setLoadingFile(false);
    }
  };

  const navigateToPath = async (dirPath: string) => {
    if (dirPath === "") {
      setLoadingFile(true);
      const toastId = toast.loading("Loading root directory...");
      try {
        const res = await fetch(`/api/repos/${id}`);
        const data = await res.json();
        if (data.success) {
          setFiles(data.files || []);
          setCurrentPath("");
          toast.success("Loaded root directory", { id: toastId });
        } else {
          toast.error(data.error || "Failed to load root contents.", {
            id: toastId,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while loading root directory.", {
          id: toastId,
        });
      } finally {
        setLoadingFile(false);
      }
      return;
    }

    handleFolderClick(dirPath);
  };

  const handleBackFolder = () => {
    const parts = currentPath.split("/");
    parts.pop();
    const parentPath = parts.join("/");
    navigateToPath(parentPath);
  };

  const handleFileClick = async (file: any) => {
    if (file.type === "dir") {
      handleFolderClick(file.path);
      return;
    }

    setLoadingFile(true);
    const toastId = toast.loading(`Loading contents of ${file.name}...`);
    try {
      const res = await fetch(
        `/api/repos/${id}/file?path=${encodeURIComponent(file.path)}`,
      );
      const data = await res.json();
      if (data.success) {
        setSelectedFile(data);
        toast.success(`Loaded ${file.name}`, { id: toastId });
      } else {
        toast.error(data.error || "Failed to load file contents.", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while loading the file.", { id: toastId });
    } finally {
      setLoadingFile(false);
    }
  };

  // Start Editing File content
  const handleStartEdit = () => {
    if (!selectedFile) return;
    setEditContent(selectedFile.content);
    setCommitMessage(`Update ${selectedFile.name} via ZeroOps`);
    setIsEditingFile(true);
  };

  // Commit File changes (Create or Update)
  const handleCommitFile = async () => {
    if (!selectedFile) return;
    setSavingFile(true);
    const toastId = toast.loading("Committing changes to GitHub...");
    try {
      const res = await fetch(`/api/repos/${id}/file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editContent,
          sha: selectedFile.sha || undefined,
          message: commitMessage || `Update ${selectedFile.name} via ZeroOps`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("File committed successfully!", { id: toastId });

        // Refresh directory tree
        await navigateToPath(currentPath);

        // Update local viewer
        setSelectedFile({
          name: selectedFile.name,
          path: selectedFile.path,
          size: new Blob([editContent]).size,
          sha: data.content?.sha || selectedFile.sha,
          content: editContent,
        });
        setIsEditingFile(false);
      } else {
        toast.error(data.error || "Failed to commit changes.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving the file.", { id: toastId });
    } finally {
      setSavingFile(false);
    }
  };

  // Delete File direct from GitHub
  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    const confirm = window.confirm(
      `Are you sure you want to delete ${selectedFile.name}? This action commits a file deletion directly to GitHub.`,
    );
    if (!confirm) return;

    setSavingFile(true);
    const toastId = toast.loading(`Deleting ${selectedFile.name}...`);
    try {
      const res = await fetch(`/api/repos/${id}/file`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile.path,
          sha: selectedFile.sha,
          message: `Delete ${selectedFile.name} via ZeroOps`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("File deleted successfully!", { id: toastId });
        setSelectedFile(null);
        setIsEditingFile(false);
        // Refresh directory listing
        await navigateToPath(currentPath);
      } else {
        toast.error(data.error || "Failed to delete file.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting the file.", {
        id: toastId,
      });
    } finally {
      setSavingFile(false);
    }
  };

  // Delete repository from GitHub & MongoDB
  const handleDeleteRepository = async () => {
    const confirm = window.confirm(
      `WARNING: Are you sure you want to delete "${repository.name}"? This action permanently deletes it from both GitHub and ZeroOps.`,
    );
    if (!confirm) return;

    const toastId = toast.loading(`Deleting repository ${repository.name}...`);
    try {
      const res = await fetch(`/api/repos/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Repository deleted successfully!", { id: toastId });
        router.push("/profile");
      } else {
        toast.error(data.error || "Failed to delete repository.", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting the repository.", {
        id: toastId,
      });
    }
  };

  // Create new file template creator
  const handleCreateNewFile = () => {
    const filename = window.prompt(
      "Enter new file path (relative to current directory, e.g. config.json):",
    );
    if (!filename) return;

    const fullPath = currentPath ? `${currentPath}/${filename}` : filename;
    const parts = filename.split("/");
    const name = parts[parts.length - 1];

    setSelectedFile({
      name,
      path: fullPath,
      size: 0,
      sha: "",
      content: "",
      isNew: true,
    });
    setEditContent("");
    setCommitMessage(`Create ${name} via ZeroOps`);
    setIsEditingFile(true);
  };

  useEffect(() => {
    if (!id) return;

    const fetchRepoDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/repos/${id}`);
        const data = await res.json();

        if (data.success) {
          setRepository(data.repository);
          setReadmeHtml(data.readmeHtml);
          setFiles(data.files || []);
          setCommits(data.commits || []);
        } else {
          setError(data.error || "Failed to load repository details.");
        }
      } catch (err) {
        console.error("Error fetching repository details:", err);
        setError("An error occurred while loading the repository.");
      } finally {
        setLoading(false);
      }
    };

    fetchRepoDetails();
  }, [id]);

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-zinc-100 px-6">
        <AlertCircle className="w-8 h-8 text-rose-500 mb-4" />
        <p className="text-zinc-400 font-mono text-xs mb-4 text-center max-w-sm">
          {error || "Repository could not be found."}
        </p>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Scoped CSS to replicate GitHub's README markdown rendering */}
      <style jsx global>{`
        .readme-html {
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
            sans-serif;
          line-height: 1.6;
          color: #d4d4d8;
        }
        .readme-html h1,
        .readme-html h2,
        .readme-html h3,
        .readme-html h4 {
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
          color: #ffffff;
          border-bottom: 1px solid rgba(39, 39, 42, 0.6);
          padding-bottom: 0.3em;
        }
        .readme-html h1 {
          font-size: 1.75em;
        }
        .readme-html h2 {
          font-size: 1.4em;
        }
        .readme-html h3 {
          font-size: 1.2em;
        }
        .readme-html p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        .readme-html a {
          color: #3b82f6;
          text-decoration: none;
        }
        .readme-html a:hover {
          text-decoration: underline;
        }
        .readme-html code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: rgba(39, 39, 42, 0.6);
          border: 1px solid rgba(63, 63, 70, 0.4);
          border-radius: 6px;
          font-family:
            ui-monospace,
            SFMono-Regular,
            SF Mono,
            Menlo,
            Consolas,
            Liberation Mono,
            monospace;
        }
        .readme-html pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: rgba(9, 9, 11, 0.8);
          border: 1px solid rgba(39, 39, 42, 0.8);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .readme-html pre code {
          background-color: transparent;
          border: none;
          padding: 0;
          font-size: inherit;
        }
        .readme-html ul,
        .readme-html ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 2em;
        }
        .readme-html li {
          margin-top: 0.25em;
        }
        .readme-html blockquote {
          padding: 0 1em;
          color: #71717a;
          border-left: 0.25em solid #27272a;
          margin: 0 0 16px 0;
        }
        .readme-html img {
          max-width: 100%;
          box-sizing: content-box;
          border-radius: 6px;
          background-color: transparent;
        }
        .readme-html table {
          border-spacing: 0;
          border-collapse: collapse;
          margin-top: 0;
          margin-bottom: 16px;
          width: 100%;
        }
        .readme-html tr {
          background-color: rgba(9, 9, 11, 0.4);
          border-top: 1px solid rgba(39, 39, 42, 0.6);
        }
        .readme-html tr:nth-child(2d) {
          background-color: rgba(39, 39, 42, 0.2);
        }
        .readme-html th,
        .readme-html td {
          padding: 6px 13px;
          border: 1px solid rgba(39, 39, 42, 0.8);
        }
      `}</style>

      <main className="relative z-10 max-w-[80vw] mx-auto pt-10 pb-32 px-6 space-y-6">
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono text-xs h-9"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Back to Registry
          </Button>

          <div className="flex items-center gap-3">
            {!loading && repository && (
              <Button
                onClick={handleDeleteRepository}
                variant="outline"
                className="border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-xs h-9 flex items-center gap-2"
              >
                Delete Repository
              </Button>
            )}
            {!loading && repository && (
              <a href={repository.html_url} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  className="border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-mono text-xs h-9 flex items-center gap-2"
                >
                  <Github className="w-3.5 h-3.5" />
                  Open in GitHub
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Repository Hero Metadata Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/10 border border-zinc-800/80 p-6 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {loading ? (
                <div className="h-6 w-64 bg-zinc-800/80 rounded animate-pulse" />
              ) : (
                <>
                  <span className="text-zinc-500 font-mono text-sm">
                    {repository?.full_name?.split("/")[0]} /
                  </span>
                  <h2 className="text-2xl font-bold text-white ">
                    {repository?.name}
                  </h2>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest border",
                      repository?.private
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700/60",
                    )}
                  >
                    {repository?.private ? "Private" : "Public"}
                  </span>
                </>
              )}
            </div>

            <div className="text-zinc-400 text-sm max-w-3xl leading-relaxed">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800/60 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-800/60 rounded w-2/3 animate-pulse" />
                </div>
              ) : (
                repository?.description || (
                  <span className="italic text-zinc-600">
                    No repository description loaded.
                  </span>
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-800/50 text-xs font-mono text-zinc-500">
              {loading ? (
                <div className="h-4 w-72 bg-zinc-800/40 rounded animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {repository?.language ? (
                      <>
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            LANGUAGE_COLOR_MAP[repository.language] ||
                              "bg-zinc-400",
                          )}
                        />
                        <span className="text-zinc-300">
                          {repository.language}
                        </span>
                      </>
                    ) : (
                      <>
                        <Tag className="w-4 h-4 text-zinc-600" />
                        <span>Untagged</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="text-zinc-300">
                      {repository?.stargazers_count} stars
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-zinc-600" />
                    <span className="text-zinc-300">
                      {repository?.forks_count} forks
                    </span>
                  </div>

                  {repository?.created_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-zinc-600" />
                      <span>
                        Created{" "}
                        {new Date(repository.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex gap-6 border-b border-zinc-800/60 pb-3">
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "pb-2 px-1 text-sm font-semibold transition-all relative flex items-center gap-2",
              activeTab === "code"
                ? "text-blue-400 font-bold"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Code2 className="w-4 h-4" />
            Code
            {activeTab === "code" && (
              <motion.div
                layoutId="repoTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("commits")}
            className={cn(
              "pb-2 px-1 text-sm font-semibold transition-all relative flex items-center gap-2",
              activeTab === "commits"
                ? "text-blue-400 font-bold"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <GitCommit className="w-4 h-4" />
            Commits
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
              {loading ? "..." : commits.length}
            </span>
            {activeTab === "commits" && (
              <motion.div
                layoutId="repoTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        </div>

        {/* Tab Content rendering */}
        <AnimatePresence mode="wait">
          {activeTab === "code" ? (
            <motion.div
              key="code-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Directory Files list */}
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                <div className="bg-zinc-900/40 border-b border-zinc-800 px-5 py-3 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => navigateToPath("")}
                      className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
                    >
                      root
                    </button>
                    {currentPath &&
                      currentPath.split("/").map((part, index, arr) => {
                        const subPath = arr.slice(0, index + 1).join("/");
                        return (
                          <span
                            key={subPath}
                            className="flex items-center gap-1.5 text-zinc-600"
                          >
                            <span>/</span>
                            <button
                              onClick={() => navigateToPath(subPath)}
                              className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
                            >
                              {part}
                            </button>
                          </span>
                        );
                      })}
                  </div>

                  <div className="flex items-center gap-3">
                    {!loading && (
                      <Button
                        onClick={handleCreateNewFile}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-white text-[10px] h-6 px-2 flex items-center gap-1 border border-blue-500/10 bg-blue-500/5 rounded"
                      >
                        <Plus className="w-3 h-3" />
                        New File
                      </Button>
                    )}
                    {currentPath && (
                      <button
                        onClick={handleBackFolder}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[10px]"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Up one level
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {loading ? (
                    <div className="p-8 flex items-center justify-center gap-3 text-zinc-500 italic">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                      <span>Fetching files tree...</span>
                    </div>
                  ) : files.length > 0 ? (
                    files.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between px-5 py-3 hover:bg-zinc-900/30 transition-all group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {file.type === "dir" ? (
                            <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <button
                            onClick={() => handleFileClick(file)}
                            disabled={loadingFile}
                            className="text-zinc-200 hover:text-blue-400 hover:underline truncate transition-colors text-left font-mono"
                          >
                            {file.name}
                          </button>
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-4 shrink-0">
                          {file.type === "file" && (
                            <span>{formatBytes(file.size)}</span>
                          )}
                          <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px]">
                            {file.type}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-zinc-600 text-xs italic">
                      No files loaded in this directory.
                    </div>
                  )}
                </div>
              </div>

              {/* File Viewer Container OR README Card */}
              {selectedFile ? (
                <div className="bg-zinc-900/10 border border-zinc-800/80 rounded-3xl backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                  <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-mono text-xs text-zinc-300 font-bold truncate max-w-sm sm:max-w-md md:max-w-lg">
                        {selectedFile.path}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({formatBytes(selectedFile.size)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditingFile && (
                        <>
                          <Button
                            onClick={handleStartEdit}
                            variant="outline"
                            size="sm"
                            className="h-7 text-zinc-300 hover:text-white border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-mono px-2"
                          >
                            Edit File
                          </Button>
                          <Button
                            onClick={handleDeleteFile}
                            variant="outline"
                            size="sm"
                            className="h-7 text-rose-400 hover:text-rose-300 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-[10px] font-mono px-2"
                          >
                            Delete File
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => {
                          setSelectedFile(null);
                          setIsEditingFile(false);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-white rounded-lg animate-fade-in"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    {isEditingFile ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">
                            File Workspace
                          </label>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full min-h-[400px] p-5 bg-zinc-950 border border-zinc-800 rounded-2xl font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none resize-y leading-relaxed"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">
                            Commit Message
                          </label>
                          <input
                            type="text"
                            placeholder="Commit message details..."
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
                          <Button
                            onClick={() => setIsEditingFile(false)}
                            variant="outline"
                            className="border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white text-xs h-9 px-4 rounded-lg font-mono"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCommitFile}
                            disabled={savingFile || !commitMessage.trim()}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-4 rounded-lg font-mono flex items-center gap-1.5"
                          >
                            {savingFile ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <GitCommit className="w-3.5 h-3.5" />
                                Commit Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <pre className="bg-zinc-950/80 border border-zinc-800/60 p-5 rounded-2xl font-mono text-xs text-zinc-300 overflow-auto max-h-[500px] leading-relaxed select-text">
                          <code>{selectedFile.content}</code>
                        </pre>
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={() => setSelectedFile(null)}
                            variant="outline"
                            className="border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white text-xs h-8 px-3 rounded-lg"
                          >
                            Return to README.md
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* README Render Card */
                <div className="bg-zinc-900/10 border border-zinc-800/80 rounded-3xl backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                  <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-6 py-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      README.md
                    </span>
                  </div>

                  <div className="p-6 md:p-8">
                    {loading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-6 bg-zinc-800/50 rounded w-1/3" />
                        <div className="h-4 bg-zinc-800/40 rounded w-full" />
                        <div className="h-4 bg-zinc-800/40 rounded w-5/6" />
                        <div className="h-4 bg-zinc-800/40 rounded w-4/5" />
                        <div className="h-4 bg-zinc-800/40 rounded w-full" />
                      </div>
                    ) : (
                      <div
                        className="readme-html"
                        dangerouslySetInnerHTML={{ __html: readmeHtml }}
                      />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="commits-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Commits History list */}
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-inner">
                <div className="bg-zinc-900/40 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-blue-500" />
                    <span className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      Commits Register
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                    {loading ? "..." : commits.length} recent commits
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <div className="p-12 flex flex-col gap-6 animate-pulse">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="space-y-2 w-2/3">
                            <div className="h-4 bg-zinc-800 rounded w-full" />
                            <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                          </div>
                          <div className="h-8 bg-zinc-800 rounded w-20" />
                        </div>
                      ))}
                    </div>
                  ) : commits.length > 0 ? (
                    commits.map((c) => (
                      <div
                        key={c.sha}
                        className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-zinc-900/10 transition-colors"
                      >
                        <div className="space-y-2">
                          <h4
                            className="text-sm font-semibold text-zinc-200 line-clamp-1"
                            title={c.message}
                          >
                            {c.message}
                          </h4>
                          <div className="flex items-center gap-2.5 text-[10px] text-zinc-500 font-mono">
                            <Avatar className="w-5 h-5 border border-zinc-800 bg-zinc-950 rounded-full shrink-0">
                              {c.author_avatar ? (
                                <AvatarImage
                                  src={c.author_avatar}
                                  alt={c.author_login}
                                  className="rounded-full"
                                />
                              ) : null}
                              <AvatarFallback className="text-[8px] bg-zinc-900 text-zinc-500">
                                {c.author_login.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-zinc-300 font-semibold">
                              {c.author_login}
                            </span>
                            <span>
                              committed on{" "}
                              {new Date(c.author_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-[10px]">
                          <a
                            href={c.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-blue-400 flex items-center gap-1 transition-all"
                          >
                            <span>{c.sha.substring(0, 7)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-16 text-center">
                      <div className="inline-flex p-3 rounded-full bg-zinc-900/30 border border-zinc-800/60 text-zinc-600 mb-3">
                        <GitCommit className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-400">
                        No commits found
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                        Ensure there are commits pushed to this repository's
                        main branch.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
