"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FiLayers, 
  FiSend, 
  FiRefreshCw, 
  FiArrowLeft, 
  FiCheck, 
  FiLoader, 
  FiTrash2, 
  FiDollarSign, 
  FiCode,
  FiCpu
} from "react-icons/fi"
import { useTheme } from "next-themes"
import { Floating3DParticles } from "@/components/ui/floating-3d-particles"
import { toast } from "sonner"
import { Canvas } from "@/components/canvas"
import { ConfigPanel } from "@/components/config-panel"
import { generateArchitectureFromPrompt } from "@/lib/gemini"
import { generateTerraform } from "@/lib/terraform-generator"
import { Button } from "@/components/ui/button"
import type { CanvasComponent, Connection } from "@/types/architecture"
import { AuthGuard } from "@/components/auth-guard"
import { calculateClosestAnchors } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "model"
  content: string
  timestamp: string
}

const PRESET_PROMPTS = [
  { label: "3-Tier Web App", prompt: "Build a classic 3-tier web application using Cloud Run for the web client, GKE for the API backend service, and a PostgreSQL Cloud SQL instance for storage. Include a Load Balancer in front." },
  { label: "Serverless Processing", prompt: "Create a serverless data ingestion pipeline with an API Gateway receiving payloads, publishing to Pub/Sub, triggering a Cloud Function to clean the data, and writing results to Firestore and Cloud Storage." },
  { label: "Secured VM Web Server", prompt: "Deploy a Compute Engine instance running a web server. Protect it with Cloud Router, Cloud DNS routing, and integrate Security Command Center and KMS for encryption." }
]

export default function AiBuilderPage() {
  return (
    <AuthGuard>
      <AiBuilderContent />
    </AuthGuard>
  )
}

function AiBuilderContent() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particleColor = mounted && resolvedTheme === "light" ? "#000000" : "#ffffff"
  
  // Canvas States
  const [components, setComponents] = useState<CanvasComponent[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedComponent, setSelectedComponent] = useState<CanvasComponent | null>(null)
  
  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am your AI Cloud Architect assistant. Describe the architecture you would like to build, or choose one of the preset architectures below to start modeling!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Persistence management
  useEffect(() => {
    try {
      const savedComponents = sessionStorage.getItem("zeroops_ai_canvas_components")
      const savedConnections = sessionStorage.getItem("zeroops_ai_canvas_connections")
      const savedMessages = sessionStorage.getItem("zeroops_ai_chat_history")
      
      if (savedComponents) setComponents(JSON.parse(savedComponents))
      if (savedConnections) setConnections(JSON.parse(savedConnections))
      if (savedMessages) setMessages(JSON.parse(savedMessages))
    } catch (e) {
      console.error("Failed to load saved state", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    sessionStorage.setItem("zeroops_ai_canvas_components", JSON.stringify(components))
  }, [components, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    sessionStorage.setItem("zeroops_ai_canvas_connections", JSON.stringify(connections))
  }, [connections, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    sessionStorage.setItem("zeroops_ai_chat_history", JSON.stringify(messages))
  }, [messages, isLoaded])

  // Canvas callbacks
  const handleAddComponent = useCallback((component: CanvasComponent) => {
    setComponents((prev) => [...prev, component])
  }, [])

  const handleUpdateComponent = useCallback((id: string, updates: Partial<CanvasComponent>) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    )
    setSelectedComponent((prev) => (prev?.id === id ? { ...prev, ...updates } : prev))
  }, [])

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id))
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id))
    setSelectedComponent(null)
  }, [])

  const handleSelectComponent = useCallback((component: CanvasComponent | null) => {
    setSelectedComponent(component)
  }, [])

  const handleDeleteConnection = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId))
  }, [])

  const handleCreateConnection = useCallback((fromId: string, toId: string) => {
    const fromComp = components.find(c => c.id === fromId)
    const toComp = components.find(c => c.id === toId)
    if (!fromComp || !toComp) return

    const { fromAnchor, toAnchor } = calculateClosestAnchors(fromComp, toComp)
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      from: fromId,
      to: toId,
      fromAnchor,
      toAnchor
    }
    setConnections((prev) => [...prev, newConnection])
  }, [components])

  // Send request to Gemini and update canvas
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue("")
    setIsLoading(true)

    try {
      // Map history format
      const history = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role,
          parts: m.content
        }))

      const result = await generateArchitectureFromPrompt(
        textToSend,
        history,
        components,
        connections
      )

      // Ensure all AI connections have correct anchors mapped
      const anchoredConnections = result.connections.map((c: any) => {
        if (c.fromAnchor && c.toAnchor) return c
        const fromComp = result.components.find((comp: any) => comp.id === c.from)
        const toComp = result.components.find((comp: any) => comp.id === c.to)
        if (fromComp && toComp) {
          const { fromAnchor, toAnchor } = calculateClosestAnchors(fromComp, toComp)
          return { ...c, fromAnchor, toAnchor }
        }
        return { ...c, fromAnchor: "bottom", toAnchor: "top" }
      })

      setComponents(result.components)
      setConnections(anchoredConnections)

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        content: result.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, modelMsg])
      toast.success("Architecture updated successfully!")
    } catch (e: any) {
      console.error(e)
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        content: `Error updating architecture: ${e.message || "Something went wrong."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, errorMsg])
      toast.error("Failed to generate architecture.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the active canvas and chat history?")) {
      setComponents([])
      setConnections([])
      setMessages([
        {
          id: "welcome",
          role: "model",
          content: "Hello! I am your AI Cloud Architect assistant. Describe the architecture you would like to build, or choose one of the preset architectures below to start modeling!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
      sessionStorage.removeItem("zeroops_ai_canvas_components")
      sessionStorage.removeItem("zeroops_ai_canvas_connections")
      sessionStorage.removeItem("zeroops_ai_chat_history")
      setSelectedComponent(null)
      toast.success("Canvas reset completed.")
    }
  }

  const handleOpenInBuilder = () => {
    // Copy active AI builder components and connections to standard ZeroOps canvas
    sessionStorage.setItem("zeroops_canvas_components", JSON.stringify(components))
    sessionStorage.setItem("zeroops_canvas_connections", JSON.stringify(connections))
    sessionStorage.setItem("terraform_view_source", "builder")
    toast.success("Diagram transferred to Cloud Builder workspace!")
    router.push("/builder")
  }

  const handleViewTerraform = () => {
    const code = generateTerraform(components, connections)
    sessionStorage.setItem("terraform_code", code)
    sessionStorage.setItem("original_terraform_code", code)
    sessionStorage.setItem("terraform_view_source", "ai-builder")
    toast.success("Terraform HCL code generated from AI architecture!")
    router.push("/terraform-view")
  }

  const totalCost = components.reduce((sum, c) => sum + (c.cost || 0), 0)

  return (
    <div className="flex h-screen w-screen bg-[#070708] text-zinc-200 overflow-hidden font-sans select-none relative">
      {/* 3D Floating Particles Background */}
      <Floating3DParticles
        color={particleColor}
        className="pointer-events-none fixed inset-0 z-0"
      />
      
      {/* Left Chat Workspace (w-[450px]) */}
      <div className="w-[450px] border-r border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md flex flex-col h-full shadow-2xl relative z-10">
        
        {/* Workspace Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push("/profile")} 
              className="p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-150 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                <FiCpu className="w-4 h-4 text-purple-400" /> AI Architect
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">PROMPT-TO-BUILDER</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-400">
              <FiDollarSign className="w-3 h-3 text-amber-500" /> ${totalCost}/mo
            </span>
            <button
              onClick={handleClear}
              title="Reset Workspace"
              className="p-1.5 hover:bg-red-950/20 hover:text-red-400 rounded-lg text-zinc-500 transition-colors border border-transparent hover:border-red-900/30"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Work area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div 
                className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-purple-650 text-zinc-50 rounded-br-none shadow-lg shadow-purple-600/10" 
                    : "bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-zinc-600 font-mono mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 max-w-[85%] mr-auto text-zinc-500 font-mono text-[10px] bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/40">
              <FiLoader className="w-3.5 h-3.5 animate-spin text-purple-400" />
              Generating topologies...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom presets or input section */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/30 space-y-4">
          
          {/* Preset Buttons */}
          {messages.length === 1 && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-zinc-500 font-mono uppercase tracking-wider block">Suggestions</span>
              <div className="flex flex-col gap-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(preset.prompt)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-855 hover:border-zinc-805 text-[11px] text-zinc-450 hover:text-zinc-200 transition-all font-sans leading-relaxed"
                  >
                    💡 <strong className="text-zinc-300">{preset.label}:</strong> {preset.prompt.substring(0, 75)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt input field */}
          <div className="flex items-center gap-2">
            <textarea
              placeholder="Explain the topology you want to deploy or update..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              rows={2}
              className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl font-sans text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-purple-600 transition-colors resize-none leading-relaxed"
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 rounded-xl shrink-0"
            >
              <FiSend className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Trigger Buttons */}
          {components.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInBuilder}
                className="flex-1 font-mono text-xs gap-1.5"
              >
                <FiLayers className="w-3.5 h-3.5 text-blue-400" /> Open in Workspace
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleViewTerraform}
                className="flex-1 font-mono text-xs gap-1.5"
              >
                <FiCode className="w-3.5 h-3.5" /> View Terraform HCL
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Canvas Display */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col bg-[#070708]">
        
        {/* Canvas Toolbar Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800/80 shadow-lg">
          <FiLayers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-mono font-bold text-zinc-400">Interactive Preview Workspace</span>
        </div>

        {/* Visual Canvas Element */}
        <div className="flex-1 w-full h-full relative">
          <Canvas
            components={components}
            connections={connections}
            selectedComponent={selectedComponent}
            onSelectComponent={handleSelectComponent}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
            onAddComponent={handleAddComponent}
            onDeleteConnection={handleDeleteConnection}
            onCreateConnection={handleCreateConnection}
          />
        </div>

        {/* Component Configuration Popover */}
        <AnimatePresence>
          {selectedComponent && (
            <ConfigPanel
              floating
              component={selectedComponent}
              onUpdate={(updates) => handleUpdateComponent(selectedComponent.id, updates)}
              onClose={() => handleSelectComponent(null)}
              onDelete={() => handleDeleteComponent(selectedComponent.id)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
