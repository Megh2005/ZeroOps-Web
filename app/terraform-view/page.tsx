"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiX,
  FiCpu,
  FiAlertTriangle,
  FiLoader,
  FiArrowLeft,
  FiCloud,
  FiTerminal,
  FiExternalLink,
  FiShield,
  FiLayers,
} from "react-icons/fi"
import { FaGithub } from "react-icons/fa6"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { validateTerraform, optimizeTerraform } from "@/lib/gemini"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useAuth } from "@/components/auth-provider"
import { useTheme } from "next-themes"
import { Floating3DParticles } from "@/components/ui/floating-3d-particles"
import { useRef } from "react"
import { SandboxConsole } from "@/components/sandbox-console"

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

function diffLines(oldStr: string, newStr: string): DiffChange[] {
  const oldLines = oldStr.split(/\r?\n/);
  const newLines = newStr.split(/\r?\n/);
  
  const m = oldLines.length;
  const n = newLines.length;
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const changes: DiffChange[] = [];
  
  let i = m;
  let j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      changes.unshift({ value: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      changes.unshift({ value: newLines[j - 1], added: true });
      j--;
    } else {
      changes.unshift({ value: oldLines[i - 1], removed: true });
      i--;
    }
  }
  
  return changes;
}

const OPTIMIZATION_STRATEGIES = [
  { id: "peep_hole", label: "Peep-Hole Optimization", desc: "Inspect a local window of instructions/code and replace them with a simpler, faster sequence." },
  { id: "dead_code", label: "Dead Code Elimination", desc: "Scan the configuration to identify and strip unused local blocks or unreferenced variables." },
  { id: "readability", label: "Readability & Maintainability", desc: "Standardize code layouts, variable definitions, and format blocks for human readability." },
  { id: "lower_cost", label: "Replacing Operations with Lower Cost Equivalents", desc: "Substitute complex dynamic function calls or heavy lookups with lighter local values." },
  { id: "loop_opt", label: "Loop Optimization", desc: "Consolidate, merge, or optimize resource loops (e.g. counts/for_each blocks) to run efficiently." }
]

export default function TerraformViewPage() {
  const router = useRouter()
  const { profile } = useAuth()
  
  const [code, setCode] = useState("")
  const [originalCode, setOriginalCode] = useState("")
  const [viewMode, setViewMode] = useState<"code" | "diff">("code")
  const [copied, setCopied] = useState(false)
  const [validationStatus, setValidationStatus] = useState<string>("")
  const [isValidating, setIsValidating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationTips, setOptimizationTips] = useState<string>("")
  const [isMounted, setIsMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const particleColor = isMounted && resolvedTheme === "light" ? "#000000" : "#ffffff"

  // Optimization checklist state
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    "peep_hole", "dead_code", "readability", "lower_cost", "loop_opt"
  ])

  // Custom strategy inputs state
  const [customSearchText, setCustomSearchText] = useState("")
  const [customStrategies, setCustomStrategies] = useState<string[]>([])

  // Git Push States
  const [selectedRepoId, setSelectedRepoId] = useState("")
  const [pushBranch, setPushBranch] = useState("main")
  const [targetFilePath, setTargetFilePath] = useState("main.tf")
  const [pushMessage, setPushMessage] = useState("")
  const [isPushing, setIsPushing] = useState(false)
  const [hasElasticPlan, setHasElasticPlan] = useState(false)

  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)

  // GCP Deployment States
  const [gcpProjects, setGcpProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [fetchingProjects, setFetchingProjects] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deploymentLogs, setDeploymentLogs] = useState<any[]>([])
  const [gcpErrorMsg, setGcpErrorMsg] = useState("")
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [projectDeployments, setProjectDeployments] = useState<any[]>([])
  const [fetchingDeployments, setFetchingDeployments] = useState(false)
  const [activeVerification, setActiveVerification] = useState<any>(null)
  const [isSandboxOpen, setIsSandboxOpen] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile?.gcpLinkedEmail) {
      fetchGcpProjects()
    }
  }, [profile])

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDeployments()
    } else {
      setProjectDeployments([])
    }
  }, [selectedProjectId])

  const fetchGcpProjects = async () => {
    setFetchingProjects(true)
    setGcpErrorMsg("")
    try {
      const res = await fetch("/api/gcp/projects")
      const data = await res.json()
      if (res.ok && data.projects) {
        setGcpProjects(data.projects)
        if (data.projects.length > 0) {
          setSelectedProjectId(data.projects[0].projectId)
        }
      } else {
        setGcpErrorMsg(data.error || "Failed to retrieve Google Cloud projects.")
      }
    } catch (err: any) {
      console.error(err)
      setGcpErrorMsg("Failed to connect to Google Cloud API.")
    } finally {
      setFetchingProjects(false)
    }
  }

  const fetchProjectDeployments = async () => {
    setFetchingDeployments(true)
    try {
      const res = await fetch(`/api/gcp/deployments?projectId=${selectedProjectId}`)
      const data = await res.json()
      if (res.ok && data.deployments) {
        setProjectDeployments(data.deployments)
      }
    } catch (err) {
      console.error("Failed to fetch deployments:", err)
    } finally {
      setFetchingDeployments(false)
    }
  }

  const handleDeployToGcp = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a target Google Cloud Project.")
      return
    }

    setDeploying(true)
    setDeploymentLogs([])
    setActiveVerification(null)
    
    const params = new URLSearchParams({
      projectId: selectedProjectId,
      code: code
    })
    
    const eventSource = new EventSource(`/api/gcp/deploy?${params.toString()}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === "verification") {
          setActiveVerification(JSON.parse(data.text))
          fetchProjectDeployments()
        } else {
          setDeploymentLogs(prev => [...prev, data])
        }
        
        if (data.text && (data.text.includes("finished successfully") || data.text.includes("Deployment failed"))) {
          setDeploying(false)
          eventSource.close()
        }

        setTimeout(() => {
          terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 50)
      } catch (err) {
        console.error("Failed to parse stream event", err)
      }
    }
    
    eventSource.onerror = (err) => {
      console.error("SSE stream error:", err)
      eventSource.close()
      setDeploying(false)
    }
  }
  const [repoSearchQuery, setRepoSearchQuery] = useState("")

  const filteredRepos = profile?.repositories?.filter((repo: any) =>
    repo.full_name.toLowerCase().includes(repoSearchQuery.toLowerCase())
  ) || []

  const activeRepo = profile?.repositories?.find((repo: any) => repo.id.toString() === selectedRepoId)

  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.includes(",")) {
      const parts = val.split(",")
      // Extract everything before the last element as completed tags
      const completedTags = parts.slice(0, -1)
        .map(t => t.trim())
        .filter(t => t !== "")
      
      if (completedTags.length > 0) {
        setCustomStrategies(prev => {
          const unique = completedTags.filter(t => !prev.includes(t))
          return [...prev, ...unique]
        })
      }
      // Put remaining input text back
      setCustomSearchText(parts[parts.length - 1] || "")
    } else {
      setCustomSearchText(val)
    }
  }

  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const trimmed = customSearchText.trim()
      if (trimmed) {
        setCustomStrategies(prev => prev.includes(trimmed) ? prev : [...prev, trimmed])
        setCustomSearchText("")
      }
    }
  }

  const removeCustomStrategy = (strategy: string) => {
    setCustomStrategies(prev => prev.filter(s => s !== strategy))
  }

  useEffect(() => {
    setIsMounted(true)
    const savedCode = sessionStorage.getItem("terraform_code")
    const savedOriginal = sessionStorage.getItem("original_terraform_code")
    if (savedCode) {
      setCode(savedCode)
      setOriginalCode(savedOriginal || savedCode)
    } else {
      toast.error("No Terraform code found. Redirecting to builder.")
      router.push("/builder")
    }
  }, [router])

  const handleValidate = async () => {
    if (!code) return
    setIsValidating(true)
    try {
      const result = await validateTerraform(code)
      
      let cleanResult = result
      if (result.includes("COST_OPTIMIZATION_REQUIRED")) {
        cleanResult = result.replace(/COST_OPTIMIZATION_REQUIRED/g, "").trim()
        toast.warning("Cost Optimization Required", {
          description: "We found ways to make your architecture cheaper! Click 'Optimize for Cost'.",
          duration: 8000,
          className: "w-[400px] max-w-[90vw]"
        })
      }
      
      setValidationStatus(cleanResult)
    } catch (error) {
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    try {
      const activeStrategiesLabels = [
        ...OPTIMIZATION_STRATEGIES
          .filter(s => selectedStrategies.includes(s.id))
          .map(s => `${s.label}: ${s.desc}`),
        ...customStrategies
      ];

      const { optimizedCode, tips } = await optimizeTerraform(code, activeStrategiesLabels)
      setCode(optimizedCode)
      setOptimizationTips(tips)
      setViewMode("diff")
      // Save optimized code to session storage in case they reload
      sessionStorage.setItem("terraform_code", optimizedCode)
      
      // Re-validate optimized code
      const validation = await validateTerraform(optimizedCode)
      setValidationStatus(validation)
    } catch (error) {
      console.error(error)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "main.tf"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Push directly to GitHub
  const handlePushToGithub = async () => {
    if (!code) {
      toast.error("No Terraform code available to push.")
      return
    }

    setIsPushing(true)
    const toastId = toast.loading("Pushing configuration file to GitHub...")
    try {
      const res = await fetch("/api/repos/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: selectedRepoId,
          branch: pushBranch,
          path: targetFilePath,
          content: code,
          message: pushMessage || "Add Terraform configuration via ZeroOps",
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.modified) {
          toast.success(`Successfully modified and updated ${targetFilePath} on branch ${pushBranch}!`, { id: toastId })
        } else {
          toast.success(`Successfully pushed new ${targetFilePath} on branch ${pushBranch}!`, { id: toastId })
        }
      } else {
        toast.error(data.error || "Failed to push to GitHub.", { id: toastId })
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while pushing to GitHub.", { id: toastId })
    } finally {
      setIsPushing(false)
    }
  }
  
  const renderLogText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer hover:underline decoration-blue-400/50 break-all"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  if (!isMounted) return null // Prevent hydration errors

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative overflow-hidden pb-24">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
          <Button
            variant="ghost"
            onClick={() => {
              const source = sessionStorage.getItem("terraform_view_source")
              if (source === "ai-builder") {
                router.push("/ai-builder")
              } else {
                router.push("/builder")
              }
            }}
            className="gap-2 text-zinc-400 hover:text-zinc-100 w-full md:w-auto"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Builder
          </Button>
          <div className="w-px h-8 bg-zinc-800 mx-2 hidden md:block" />
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center justify-center md:justify-start gap-2">
              <FiCpu className="w-6 h-6 text-blue-400" /> Generated Terraform
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Infrastructure as Code View</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full lg:w-auto">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <FiCheck className="w-4 h-4 text-emerald-500" /> : <FiCopy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <FiDownload className="w-4 h-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={isValidating || !code}
            className="gap-2"
          >
            {isValidating ? <FiLoader className="w-4 h-4 animate-spin text-blue-400" /> : <FiCheck className="w-4 h-4 text-blue-400" />}
            Check Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSandboxOpen(true)}
            disabled={!code}
            className="gap-2 text-purple-300 font-semibold"
          >
            <FiTerminal className="w-4 h-4 text-purple-400" />
            Sandbox Check
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleOptimize}
            disabled={isOptimizing || !code}
            className="gap-2 font-semibold"
          >
            {isOptimizing ? <FiLoader className="w-4 h-4 animate-spin" /> : "Optimize for Cost"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsDeployModalOpen(true)}
            disabled={!code}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <FiCloud className="w-4 h-4" />
            Deploy to Google Cloud
          </Button>
        </div>
      </header>

      {/* Main Content Area (Vertical single column) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-12 flex flex-col gap-8">
        
        {/* Cost Optimization Settings Card */}
        <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-3">
            <FiLayers className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-mono text-zinc-300 font-bold">
              Cost Optimization Settings (Multi-Select)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OPTIMIZATION_STRATEGIES.map((s) => (
              <div 
                key={s.id} 
                onClick={() => toggleStrategy(s.id)}
                className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${
                  selectedStrategies.includes(s.id) 
                    ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/40" 
                    : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedStrategies.includes(s.id)}
                  onChange={() => {}} // handled by parent onClick
                  className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 bg-zinc-950 h-3.5 w-3.5 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className={`text-xs font-semibold block ${selectedStrategies.includes(s.id) ? "text-emerald-400" : "text-zinc-350"}`}>
                    {s.label}
                  </span>
                  <p className="text-[10px] text-zinc-550 leading-snug">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Custom Requirements Input (Others Box) */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/40">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-400 block font-mono">
                Other Special Requirements
              </label>
              <p className="text-[10px] text-zinc-500 leading-snug">
                Type any custom constraints or guidelines here. Hit comma `,` or Enter to add a badge.
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                placeholder="e.g. enforce SSL everywhere, use specific custom naming tags, enable logging..."
                value={customSearchText}
                onChange={handleCustomInputChange}
                onKeyDown={handleCustomInputKeyDown}
                className="w-full h-10 px-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 focus:border-zinc-550 focus:outline-none"
              />
              
              {/* Badge Preview */}
              {customStrategies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customStrategies.map((badge, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/25 rounded-full text-[10px] font-bold text-emerald-400 font-mono shadow-sm"
                    >
                      {badge}
                      <button
                        type="button"
                        onClick={() => removeCustomStrategy(badge)}
                        className="text-emerald-500 hover:text-rose-450 focus:outline-none text-[11px] font-bold h-3 w-3 flex items-center justify-center rounded-full hover:bg-rose-500/10"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation Box */}
        <AnimatePresence>
          {validationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-2xl border shadow-xl ${validationStatus.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/5" : "bg-amber-500/10 border-amber-500/20 text-amber-300 shadow-amber-500/5"}`}
            >
              <h3 className="font-semibold mb-3 uppercase tracking-widest text-xs opacity-80 flex items-center gap-2">
                {validationStatus.startsWith("✅") ? <FiCheck className="w-4 h-4" /> : <FiAlertTriangle className="w-4 h-4" />}
                Validation Result
              </h3>
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{validationStatus}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Block */}
        <div className="flex flex-col flex-1 min-h-[60vh]">
          <div className="flex items-center justify-between bg-zinc-900/50 p-6 border border-b-0 border-zinc-800/80 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mr-2">Main.tf</span>
              {originalCode && code && originalCode !== code && (
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/60">
                  <button
                    onClick={() => setViewMode("code")}
                    className={`px-3 py-1 rounded text-[10px] font-semibold font-mono transition-all ${
                      viewMode === "code" ? "bg-zinc-850 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Optimized Code
                  </button>
                  <button
                    onClick={() => setViewMode("diff")}
                    className={`px-3 py-1 rounded text-[10px] font-semibold font-mono transition-all ${
                      viewMode === "diff" ? "bg-zinc-850 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Diff View
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 bg-zinc-950/40 px-3 py-1.5 rounded-full border border-zinc-800/60">
              <span className="text-[10px] font-semibold text-zinc-400 font-mono tracking-wide">Do you have elastic plan?</span>
              <button 
                type="button" 
                onClick={() => setHasElasticPlan(!hasElasticPlan)}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent p-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasElasticPlan ? "bg-blue-500" : "bg-zinc-850"
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                    hasElasticPlan ? "translate-x-4 bg-white" : "translate-x-0 bg-zinc-400"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="flex-1 text-sm font-mono bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-b-2xl text-zinc-300 leading-relaxed shadow-inner flex flex-col min-h-[450px]">
            {viewMode === "diff" && originalCode && code ? (
              <div className="flex flex-col font-mono text-xs select-text overflow-x-auto">
                {diffLines(originalCode, code).map((change, idx) => {
                  let lineClass = "text-zinc-450 opacity-80"
                  let prefix = " "
                  if (change.added) {
                    lineClass = "bg-emerald-950/30 border-l-2 border-emerald-500 text-emerald-400 px-3 py-1 font-medium"
                    prefix = "+"
                  } else if (change.removed) {
                    lineClass = "bg-rose-950/30 border-l-2 border-rose-500 text-rose-450 px-3 py-1 line-through opacity-70"
                    prefix = "-"
                  } else {
                    lineClass = "px-3 py-0.5 text-zinc-400"
                  }
                  return (
                    <div key={idx} className={`${lineClass} whitespace-pre`}>
                      {prefix} {change.value || ""}
                    </div>
                  )
                })}
              </div>
            ) : (
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  sessionStorage.setItem("terraform_code", e.target.value)
                }}
                spellCheck={false}
                className="w-full flex-1 min-h-[400px] font-mono text-xs leading-relaxed text-zinc-200 bg-transparent border-0 outline-none resize-none focus:ring-0 p-1 select-text"
                placeholder="# Paste or edit your custom Terraform HCL code here..."
              />
            )}
          </div>
        </div>

        {/* Push to GitHub Section */}
        {code && (
          <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl shadow-xl space-y-4">
            <h4 className="text-sm font-mono text-zinc-300 font-bold flex items-center gap-2">
              <FaGithub className="w-5 h-5 text-blue-400" />
              Push Code Directly to GitHub
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Target Repository */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Target Repository
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                    className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none text-left flex items-center justify-between hover:bg-zinc-900 transition-colors"
                  >
                    <span className="truncate">
                      {activeRepo 
                        ? `${activeRepo.full_name} (${activeRepo.private ? "Private" : "Public"})` 
                        : "-- Select Repository --"}
                    </span>
                    <span className="text-zinc-500 text-[10px]">▼</span>
                  </button>

                  {isRepoDropdownOpen && (
                    <>
                      {/* Backdrop overlay to dismiss dropdown */}
                      <div className="fixed inset-0 z-20" onClick={() => {
                        setIsRepoDropdownOpen(false)
                        setRepoSearchQuery("")
                      }} />
                      
                      <div className="absolute left-0 right-0 mt-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-30 flex flex-col gap-2 max-h-60">
                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search repositories..."
                            value={repoSearchQuery}
                            onChange={(e) => setRepoSearchQuery(e.target.value)}
                            className="w-full h-8 px-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-zinc-300 focus:border-zinc-500 focus:outline-none"
                            autoFocus
                          />
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5 scrollbar-thin max-h-40">
                          {filteredRepos.length > 0 ? (
                            filteredRepos.map((repo: any) => (
                              <button
                                key={repo.id}
                                type="button"
                                onClick={() => {
                                  setSelectedRepoId(repo.id.toString())
                                  setIsRepoDropdownOpen(false)
                                  setRepoSearchQuery("")
                                }}
                                className={`w-full text-left px-2 py-1.5 font-mono text-[11px] rounded transition-colors ${
                                  selectedRepoId === repo.id.toString()
                                    ? "bg-blue-600 text-white"
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`}
                              >
                                {repo.full_name} <span className="opacity-60 text-[10px]">({repo.private ? "Private" : "Public"})</span>
                              </button>
                            ))
                          ) : (
                            <div className="text-center py-3 text-zinc-600 font-mono text-[10px]">
                              No repositories found
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Commit Branch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Commit Branch / New Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={pushBranch}
                  onChange={(e) => setPushBranch(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              {/* Target Path in Repo */}
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
                placeholder="Add Terraform configuration via ZeroOps"
                value={pushMessage}
                onChange={(e) => setPushMessage(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handlePushToGithub}
                disabled={isPushing || !selectedRepoId || !pushBranch.trim() || !targetFilePath.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs gap-1.5"
              >
                {isPushing ? (
                  <>
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <FaGithub className="w-3.5 h-3.5" />
                    Push File directly to GitHub
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Google Cloud Platform Deployment Modal */}
        <AnimatePresence>
          {isDeployModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <FiCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100">Deploy Infrastructure to Google Cloud</h3>
                      <p className="text-xs text-zinc-400 mt-0.5 font-mono">Provision active resources directly to GCP Console</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!deploying) {
                        setIsDeployModalOpen(false)
                        setDeploymentLogs([])
                      }
                    }}
                    disabled={deploying}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {!profile?.gcpLinkedEmail ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                      <FiAlertTriangle className="w-10 h-10 text-amber-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-300">Google Cloud Account is not connected</p>
                        <p className="text-xs text-zinc-500 max-w-sm">
                          Please connect your Google Cloud account in your Developer Profile settings before launching deployments.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsDeployModalOpen(false)
                          router.push("/profile")
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                      >
                        Go to Profile Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {deploymentLogs.length === 0 && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                            <FiShield className="w-5 h-5 text-blue-400 shrink-0" />
                            <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                              Connected as: <span className="text-white font-bold">{profile.gcpLinkedEmail}</span>
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                              Select Google Cloud Project
                            </label>
                            {fetchingProjects ? (
                              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 py-2">
                                <FiLoader className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                Retrieving cloud projects list...
                              </div>
                            ) : gcpErrorMsg ? (
                              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl space-y-2">
                                <p className="text-xs font-mono leading-relaxed">{gcpErrorMsg}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={fetchGcpProjects}
                                  className="border-rose-950 bg-transparent hover:bg-rose-900/10 text-rose-300 text-[10px] h-7 px-2.5 rounded-lg transition-colors font-mono"
                                >
                                  Try Refreshing
                                </Button>
                              </div>
                            ) : gcpProjects.length === 0 ? (
                              <div className="text-xs font-mono text-zinc-500 py-2">
                                No active Google Cloud projects found. Please create a project on the Google Cloud Console first.
                              </div>
                            ) : (
                              <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                              >
                                {gcpProjects.map((p) => (
                                  <option key={p.projectId} value={p.projectId}>
                                    {p.name} ({p.projectId})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Version Check & Deploy Status */}
                          {selectedProjectId && (
                            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3 font-mono">
                              {fetchingDeployments ? (
                                <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                  <FiLoader className="w-3 h-3 animate-spin text-blue-400" />
                                  Checking active deployments status...
                                </div>
                              ) : projectDeployments.length > 0 ? (
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between text-xs text-zinc-300">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Deployment Status</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                      Deployed (v{projectDeployments[0].version})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 space-y-1">
                                    <div><span className="text-zinc-600">Verification ID:</span> {projectDeployments[0].deploymentId}</div>
                                    <div><span className="text-zinc-600">Deployed At:</span> {new Date(projectDeployments[0].deployedAt).toLocaleString()}</div>
                                    <div className="text-[9px] text-zinc-500 break-all leading-relaxed bg-zinc-900 p-2.5 rounded mt-1 border border-zinc-850 select-all">
                                      <span className="font-bold text-zinc-400 uppercase tracking-wider block mb-1">Verification Signature:</span>
                                      {projectDeployments[0].verificationSignature}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400">
                                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Deployment Status</span>
                                  No previous deployments found for project "{selectedProjectId}". Ready for initial version release.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deploy History dropdown list */}
                          {projectDeployments.length > 1 && (
                            <div className="space-y-2 font-mono">
                              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                                Deployment History Log ({projectDeployments.length} releases)
                              </label>
                              <div className="border border-zinc-850 rounded-xl divide-y divide-zinc-850 overflow-hidden max-h-[140px] overflow-y-auto bg-zinc-950/40">
                                {projectDeployments.map((d, index) => (
                                  <div key={d.id} className="p-3 text-[10px] flex items-center justify-between hover:bg-zinc-950/80 transition-colors">
                                    <div>
                                      <div className="font-semibold text-zinc-300">Version v{d.version} <span className="text-zinc-500 font-normal">({d.deploymentId})</span></div>
                                      <div className="text-zinc-500 mt-0.5">{new Date(d.deployedAt).toLocaleString()}</div>
                                    </div>
                                    <div className="text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded select-all font-mono">
                                      Sig: {d.verificationSignature.substring(0, 12)}...
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Active Verification Certificate Output */}
                      {activeVerification && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-4 font-mono shadow-lg shadow-emerald-500/5"
                        >
                          <div className="flex items-center gap-2.5 text-emerald-400">
                            <FiShield className="w-5 h-5" />
                            <h4 className="font-bold text-xs uppercase tracking-wider">Deployment Verified Successfully</h4>
                          </div>
                          
                          <div className="text-[11px] text-zinc-300 space-y-1.5 leading-relaxed">
                            <div><span className="text-zinc-500">Deployment ID:</span> <span className="text-zinc-200">{activeVerification.deploymentId}</span></div>
                            <div><span className="text-zinc-500">Active Version:</span> <span className="text-emerald-400 font-bold">Version v{activeVerification.version}</span></div>
                            <div><span className="text-zinc-500">GCP Operation:</span> <span className="text-zinc-200">{activeVerification.gcpOperationId}</span></div>
                            <div><span className="text-zinc-500">Timestamp:</span> <span className="text-zinc-200">{new Date(activeVerification.deployedAt).toLocaleString()}</span></div>
                            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-850 break-all select-all mt-2">
                              <span className="font-bold text-emerald-500 uppercase tracking-widest text-[9px] block mb-1">Verification Hash Code:</span>
                              {activeVerification.verificationSignature}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Deployment Log Terminal Output */}
                      {(deploying || (deploymentLogs.length > 0 && !activeVerification)) && (
                        <div className="border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                          {/* Terminal Header */}
                          <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-850 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FiTerminal className="w-4 h-4 text-zinc-500" />
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                                Terraform Build stdout
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-zinc-850" />
                              <div className="w-2 h-2 rounded-full bg-zinc-850" />
                              <div className="w-2 h-2 rounded-full bg-zinc-850" />
                            </div>
                          </div>

                          {/* Terminal Window */}
                          <div className="p-5 font-mono text-[11px] leading-relaxed h-[300px] overflow-y-auto bg-black/60 space-y-1 select-text">
                            {deploymentLogs.map((log, idx) => {
                              let textClass = "text-zinc-400"
                              if (log.type === "success") textClass = "text-emerald-400"
                              if (log.type === "warn") textClass = "text-amber-400"
                              if (log.type === "error") textClass = "text-rose-500 font-bold"
                              if (log.type === "terraform") textClass = "text-zinc-500 font-bold"

                              return (
                                <div key={idx} className={`${textClass} whitespace-pre-wrap`}>
                                  {renderLogText(log.text)}
                                </div>
                              )
                            })}
                            <div ref={terminalEndRef} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                {profile?.gcpLinkedEmail && (
                  <div className="p-6 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
                    <div className="text-[10px] font-mono text-zinc-500">
                      {deploying ? "Deploying..." : "Ready to launch"}
                    </div>
                    <div className="flex gap-3">
                      {deploymentLogs.length === 0 ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeployModalOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDeployToGcp}
                            disabled={deploying || !selectedProjectId}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs gap-1.5"
                          >
                            {deploying ? (
                              <>
                                <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                Running Terraform...
                              </>
                            ) : projectDeployments.length > 0 ? (
                              <>
                                <FiCloud className="w-3.5 h-3.5" />
                                Deploy New Version (v{projectDeployments[0].version + 1})
                              </>
                            ) : (
                              <>
                                <FiCloud className="w-3.5 h-3.5" />
                                Confirm & Start Deploy
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsDeployModalOpen(false)
                            setDeploymentLogs([])
                          }}
                          disabled={deploying}
                          className="font-semibold text-xs"
                        >
                          Close Console
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Optimization Tips (Vertical alignment below code) */}
        <AnimatePresence>
          {optimizationTips && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 lg:p-12 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl mt-4 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-8 border-b border-zinc-800/50 pb-6">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <FiLayers className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="font-semibold text-2xl text-emerald-400 tracking-wide">
                  Cost Savings & Optimization
                </h4>
              </div>
              <div className="text-base text-zinc-300 leading-relaxed prose prose-invert prose-emerald max-w-none">
                <MarkdownRenderer content={optimizationTips} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sandbox Console Panel */}
        <AnimatePresence>
          {isSandboxOpen && (
            <SandboxConsole code={code} onClose={() => setIsSandboxOpen(false)} />
          )}
        </AnimatePresence>

      </main>
      
      <footer className="p-8 border-t border-zinc-800/50 bg-zinc-950/80 text-center">
        <p className="text-sm text-zinc-500 font-medium">
          ⚠️ AI generated content. Always validate before applying to production.
        </p>
      </footer>
    </div>
  )
}
