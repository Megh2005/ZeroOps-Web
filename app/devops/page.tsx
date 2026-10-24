"use client";

import { useState, useRef, forwardRef } from "react";
import { useReactToPrint } from "react-to-print";
import { migrateTerraform, getArchitecturalSuggestions } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Cloud,
  Terminal,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Activity,
  Printer,
  Upload,
  Download,
  Github
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

const CLOUD_OPTIONS = ["AWS", "GCP", "Digital Ocean"];

const PrintableReport = forwardRef<HTMLDivElement, { title: string; content: string }>(({ title, content }, ref) => {
  return (
    <div ref={ref} className="p-16 bg-white text-black min-h-screen font-sans">
      <div className="border-b-2 border-black pb-8 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-black mb-1">ZEROOPS CORE</h1>
          <p className="text-sm text-gray-500 font-mono uppercase tracking-widest">Enterprise Infrastructure Report</p>
        </div>
        <div className="text-right text-xs text-gray-500 font-mono uppercase tracking-widest">
          {new Date().toLocaleDateString()} <br />
          {new Date().toLocaleTimeString()}
        </div>
      </div>
      <h2 className="text-2xl font-bold text-black mb-8 border-b border-gray-200 pb-4">{title}</h2>
      <div className="prose prose-sm max-w-none prose-headings:text-black prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-black prose-code:text-blue-700 font-sans leading-relaxed">
        <MarkdownRenderer content={content} isPrint={true} />
      </div>
      <div className="mt-20 pt-8 border-t-2 border-black text-center text-[10px] text-gray-500 font-mono uppercase tracking-widest">
        Confidential & Proprietary • ZeroOps System Intelligence
      </div>
    </div>
  );
});
PrintableReport.displayName = "PrintableReport";

export default function DevOpsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"terraform" | "architecture" | "migrator">("migrator");
  const [fromCloud, setFromCloud] = useState("AWS");
  const [toCloud, setToCloud] = useState("GCP");
  const [terraformCode, setTerraformCode] = useState("");
  const [terraformOutput, setTerraformOutput] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  // Push to GitHub state variables
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [pushBranch, setPushBranch] = useState("main");
  const [targetFilePath, setTargetFilePath] = useState("main.tf");
  const [pushMessage, setPushMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);

  const [archDescription, setArchDescription] = useState("");
  const [archOutput, setArchOutput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const terraformPrintRef = useRef<HTMLDivElement>(null);
  const archPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintTerraform = useReactToPrint({
    contentRef: terraformPrintRef,
    documentTitle: "Terraform-Migration-Report",
  });

  const handlePrintArchitecture = useReactToPrint({
    contentRef: archPrintRef,
    documentTitle: "Architecture-Design-Report",
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setTerraformCode(text);
        toast.success(`Uploaded ${file.name} successfully!`);
      };
      reader.readAsText(file);
    }
  };

  const handleMigrate = async () => {
    if (!terraformCode.trim()) return;
    if (fromCloud === toCloud) {
      toast.error("Source and target cloud systems cannot be the same.");
      return;
    }
    setIsMigrating(true);

    const migratePromise = migrateTerraform(terraformCode, fromCloud, toCloud);

    toast.promise(migratePromise, {
      loading: `Translating infrastructure configurations from ${fromCloud} to ${toCloud}...`,
      success: (result) => {
        setTerraformOutput(result);
        return "Migration complete.";
      },
      error: (err) => {
        setTerraformOutput("An error occurred during translation.");
        return "Migration translation failed.";
      },
    });

    try {
      await migratePromise;
    } finally {
      setIsMigrating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!archDescription.trim()) return;
    setIsAnalyzing(true);

    const analyzePromise = getArchitecturalSuggestions(archDescription);

    toast.promise(analyzePromise, {
      loading: "Synthesizing architecture...",
      success: (result) => {
        setArchOutput(result);
        return "Synthesis complete.";
      },
      error: (err) => {
        setArchOutput("An error occurred while analyzing.");
        return "Synthesis failed.";
      },
    });

    try {
      await analyzePromise;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractMigratedCode = (md: string) => {
    const sectionIndex = md.indexOf("## Migrated Code");
    if (sectionIndex === -1) return "";
    const afterSection = md.substring(sectionIndex);
    const codeBlockMatch = afterSection.match(/```(?:hcl|terraform)?([\s\S]*?)```/);
    return codeBlockMatch ? codeBlockMatch[1].trim() : "";
  };

  const handleDownloadMigratedFile = () => {
    const code = extractMigratedCode(terraformOutput);
    if (!code) {
      toast.error("No raw HCL code found in the migrated results to download.");
      return;
    }
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "migrated-main.tf";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded migrated-main.tf!");
  };

  const handlePushToGithub = async () => {
    const code = extractMigratedCode(terraformOutput);
    if (!code) {
      toast.error("No migrated code found to push.");
      return;
    }

    setIsPushing(true);
    const toastId = toast.loading("Pushing configuration file to GitHub...");
    try {
      const res = await fetch("/api/repos/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: selectedRepoId,
          branch: pushBranch,
          path: targetFilePath,
          content: code,
          message: pushMessage || `Migrate HCL template via ZeroOps`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.modified) {
          toast.success(`Successfully modified and updated ${targetFilePath} on branch ${pushBranch}!`, { id: toastId });
        } else {
          toast.success(`Successfully pushed new ${targetFilePath} on branch ${pushBranch}!`, { id: toastId });
        }
      } else {
        toast.error(data.error || "Failed to push to GitHub.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while pushing to GitHub.", { id: toastId });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 selection:bg-zinc-500/30">
      <SiteHeader />

      <main className="relative z-10 pt-32 pb-20 w-[80vw] mx-auto px-0">
        <div className="flex flex-col items-center text-center space-y-4 mb-16 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/30 px-3 py-1 text-[10px] font-mono tracking-widest uppercase text-zinc-400 shadow-sm mx-auto">
              <Activity className="h-3 w-3 text-blue-500" />
              <span>System Intelligence Core</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl mb-6 text-zinc-100">
              Cloud Infrastructure <br />
              <span className="text-zinc-500">
                Migration Core
              </span>
            </h1>
            <p className="text-xs font-mono text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Orchestrate multi-cloud topologies and translate provider states utilizing our advanced cognitive translator.
            </p>
          </motion.div>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="flex p-1 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/80 rounded">
            <button
              onClick={() => setActiveTab("migrator")}
              className={cn(
                "relative px-8 py-2 rounded text-xs font-semibold transition-all duration-300",
                activeTab === "migrator"
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-300",
              )}
            >
              {activeTab === "migrator" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-zinc-100 rounded"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Cloud Migrator
              </span>
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={cn(
                "relative px-8 py-2 rounded text-xs font-semibold transition-all duration-300",
                activeTab === "architecture"
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-300",
              )}
            >
              {activeTab === "architecture" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-zinc-100 rounded"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Cloud className="w-4 h-4" /> Topology Architect
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "migrator" ? (
            <motion.div
              key="migrator"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-2xl p-1 shadow-2xl overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
                        Terraform Cloud Migrator
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Select clouds, upload your Terraform configuration, and convert providers instantly.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".tf"
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono text-xs h-9 flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload .tf File
                      </Button>
                    </div>
                  </div>

                  {/* Cloud selection Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-xl border border-zinc-800 bg-zinc-950/40">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                        Present Cloud System
                      </label>
                      <select
                        value={fromCloud}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFromCloud(val);
                          if (val === toCloud) {
                            const other = CLOUD_OPTIONS.find(o => o !== val) || "GCP";
                            setToCloud(other);
                          }
                        }}
                        className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                      >
                        {CLOUD_OPTIONS.map(opt => (
                          <option key={`from-${opt}`} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                        Target Cloud System
                      </label>
                      <select
                        value={toCloud}
                        onChange={(e) => setToCloud(e.target.value)}
                        className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                      >
                        {CLOUD_OPTIONS.filter(opt => opt !== fromCloud).map(opt => (
                          <option key={`to-${opt}`} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative group">
                    <Textarea
                      placeholder='# Paste your Terraform configurations here or upload a file...'
                      className="relative min-h-[300px] font-mono text-sm bg-zinc-950/50 border-zinc-800 text-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 resize-none p-6 rounded"
                      value={terraformCode}
                      onChange={(e) => setTerraformCode(e.target.value)}
                    />
                    {/* Example Prompts */}
                    <div className="absolute bottom-4 right-4 left-4 flex gap-2 justify-end overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
                      <button
                        onClick={() =>
                          setTerraformCode(`provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "web" {
  name = "web-sg"
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`)
                        }
                        className="shrink-0 text-[10px] font-mono uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors backdrop-blur-md"
                      >
                        AWS Security Group
                      </button>
                      <button
                        onClick={() =>
                          setTerraformCode(`provider "google" {
  project = "my-project-id"
  region  = "us-central1"
}

resource "google_compute_instance" "vm" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }
  network_interface {
    network = "default"
  }
}`)
                        }
                        className="shrink-0 text-[10px] font-mono uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors backdrop-blur-md"
                      >
                        GCP Compute Instance
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleMigrate}
                      disabled={isMigrating || !terraformCode.trim()}
                      className="h-10 px-8 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold transition-all text-xs"
                    >
                      {isMigrating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Translating Provider State...
                        </>
                      ) : (
                        <>
                          Migrate Infrastructure{" "}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {terraformOutput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-zinc-800/80 bg-zinc-900/30"
                  >
                    <div className="p-6 md:p-8 space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold tracking-tight">
                          <CheckCircle2 className="w-5 h-5" /> Migration Plan Generated
                        </div>
                        <div className="flex items-center gap-2">
                          {extractMigratedCode(terraformOutput) && (
                            <Button
                              onClick={handleDownloadMigratedFile}
                              variant="outline"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-xs font-mono"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Download migrated-main.tf
                            </Button>
                          )}
                          <Button
                            onClick={handlePrintTerraform}
                            variant="outline"
                            size="sm"
                            className="text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border-zinc-700 text-xs font-mono"
                          >
                            <Printer className="w-3 h-3 mr-2" />
                            Print Plan Report
                          </Button>
                        </div>
                      </div>
                      <div className="text-zinc-300 text-sm font-mono leading-relaxed select-text">
                        <MarkdownRenderer content={terraformOutput} />
                      </div>

                      {/* Push to GitHub Section */}
                      {extractMigratedCode(terraformOutput) && (
                        <div className="border-t border-zinc-800/80 pt-6 space-y-4">
                          <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
                            <Github className="w-4 h-4 text-blue-500" />
                            Push Migrated HCL Directly to GitHub
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Dropdown of repositories */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Target Repository
                              </label>
                              <select
                                value={selectedRepoId}
                                onChange={(e) => setSelectedRepoId(e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                              >
                                <option value="">-- Select Repository --</option>
                                {profile?.repositories?.map((repo: any) => (
                                  <option key={repo.id} value={repo.id}>
                                    {repo.full_name} ({repo.private ? "Private" : "Public"})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Branch input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Commit Branch
                              </label>
                              <input
                                type="text"
                                placeholder="main"
                                value={pushBranch}
                                onChange={(e) => setPushBranch(e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800/80 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                              />
                            </div>

                            {/* Target filepath input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Target Path in Repo
                              </label>
                              <input
                                type="text"
                                placeholder="main.tf"
                                value={targetFilePath}
                                onChange={(e) => setTargetFilePath(e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                              Commit Message
                            </label>
                            <input
                              type="text"
                              placeholder="Migrate HCL template via ZeroOps"
                              value={pushMessage}
                              onChange={(e) => setPushMessage(e.target.value)}
                              className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              onClick={handlePushToGithub}
                              disabled={isPushing || !selectedRepoId || !pushBranch.trim() || !targetFilePath.trim()}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs h-9 px-4 flex items-center gap-1.5 rounded-lg transition-all"
                            >
                              {isPushing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Pushing...
                                </>
                              ) : (
                                <>
                                  <Github className="w-3.5 h-3.5" />
                                  Push Code directly to GitHub
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: "none" }}>
                        <PrintableReport ref={terraformPrintRef} title={`Terraform Migration Plan (${fromCloud} to ${toCloud})`} content={terraformOutput} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-2xl p-1 shadow-2xl overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
                        Topology Synthesizer
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Input scale and connectivity parameters
                      </p>
                    </div>
                  </div>

                  <div className="relative group">
                    <Textarea
                      placeholder="e.g., Target: Highly available microservices orchestration on Kubernetes with managed relational stores..."
                      className="relative min-h-[200px] text-sm font-mono bg-zinc-950/50 border-zinc-800 text-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 resize-none p-6 rounded"
                      value={archDescription}
                      onChange={(e) => setArchDescription(e.target.value)}
                    />
                    {/* Example Prompts */}
                    <div className="absolute bottom-4 right-4 left-4 flex gap-2 justify-end overflow-x-auto pb-1 no-scrollbar">
                      <button
                        onClick={() =>
                          setArchDescription(
                            "Design a serverless event-driven architecture using Cloud Run, Pub/Sub, and Eventarc to process images uploaded to Cloud Storage.",
                          )
                        }
                        className="shrink-0 text-[10px] font-mono uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors backdrop-blur-md"
                      >
                        Serverless Pipeline
                      </button>
                      <button
                        onClick={() =>
                          setArchDescription(
                            "I need a globally distributed, high-availability web application architecture using Cloud Spanner and Global Load Balancing.",
                          )
                        }
                        className="shrink-0 text-[10px] font-mono uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors backdrop-blur-md"
                      >
                        Global HA Core
                      </button>
                      <button
                        onClick={() =>
                          setArchDescription(
                            "Design a scalable data lake and analytics platform using Cloud Storage, BigQuery, and Dataflow for real-time processing.",
                          )
                        }
                        className="shrink-0 text-[10px] font-mono uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded transition-colors backdrop-blur-md"
                      >
                        Data Analytics
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !archDescription.trim()}
                      className="h-10 px-8 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold transition-all text-xs"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Synthesizing...
                        </>
                      ) : (
                        <>
                          Generate Blueprint{" "}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {archOutput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-zinc-800/80 bg-zinc-900/30"
                  >
                    <div className="p-6 md:p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold tracking-tight">
                          <Sparkles className="w-5 h-5" /> Recommendation
                        </div>
                        <Button
                          onClick={handlePrintArchitecture}
                          variant="outline"
                          size="sm"
                          className="text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border-zinc-700 text-xs font-mono"
                        >
                          <Printer className="w-3 h-3 mr-2" />
                          Print / Export PDF
                        </Button>
                      </div>
                      <div className="text-zinc-300 text-sm font-mono leading-relaxed">
                        <MarkdownRenderer content={archOutput} />
                      </div>
                      <div style={{ display: "none" }}>
                        <PrintableReport ref={archPrintRef} title="Architecture Design Report" content={archOutput} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
