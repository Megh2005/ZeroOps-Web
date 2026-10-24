"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Send, Sparkles, Loader2, ShieldAlert, DollarSign, Bot, User, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { chatAboutArchitecture } from "@/lib/gemini"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { CanvasComponent, Connection } from "@/types/architecture"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface ChatPanelProps {
  components: CanvasComponent[]
  connections: Connection[]
  onClose: () => void
}

interface ChatMessage {
  role: "user" | "model"
  content: string
  timestamp: number
}

const PRESET_PROMPTS = [
  {
    label: "Security Audit",
    prompt: "Audit this architecture for security risks, open ports, and IAM best practices.",
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
  },
  {
    label: "Cost Optimization",
    prompt: "How can I optimize the monthly cost of this infrastructure?",
    icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
  },
  {
    label: "Best Practices",
    prompt: "Does this GCP architecture follow standard reliability and scalability patterns?",
    icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />
  },
  {
    label: "Explain Connections",
    prompt: "List all components on my canvas and explain how they connect and communicate.",
    icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
  }
]

export function ChatPanel({ components, connections, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: "Hi! I am your ZeroOps Architect AI. Ask me anything about your current diagram's security, pricing, or connections, and I'll give you a quick review.",
      timestamp: Date.now()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = async (textToSend: string = input) => {
    const userPrompt = textToSend.trim()
    if (!userPrompt || isLoading) return

    const userMsg: ChatMessage = {
      role: "user",
      content: userPrompt,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    // Build history for startChat (excluding the initial model welcome message)
    const history = messages.slice(1).map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }))

    try {
      const response = await chatAboutArchitecture(userPrompt, components, connections, history)
      const modelMsg: ChatMessage = {
        role: "model",
        content: response,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, modelMsg])
    } catch (err: any) {
      console.error("Failed to chat with AI:", err)
      toast.error("Failed to get response from Architect AI")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ x: 500, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 500, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-[500px] bg-card border-l border-border flex flex-col shrink-0 overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Architect AI</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Canvas
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 max-w-[90%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
          >
            <div className={`p-1 rounded-lg h-fit shrink-0 ${msg.role === "user" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground rounded-tr-none" 
                : "bg-accent/40 text-muted-foreground rounded-tl-none border border-border"
            }`}>
              <div className="font-sans prose prose-invert max-w-none">
                <MarkdownRenderer content={msg.content} />
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 max-w-[90%] self-start">
            <div className="p-1 rounded-lg h-fit shrink-0 bg-primary/10 text-primary">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-2.5 rounded-2xl text-[11px] bg-accent/40 text-muted-foreground rounded-tl-none border border-border flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              Analyzing...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Footer controls & input */}
      <div className="p-4 border-t border-border space-y-3 bg-zinc-950/20">
        {/* Preset Prompts */}
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset.prompt)}
                className="flex items-center gap-1.5 p-2 bg-background hover:bg-muted border border-border rounded-lg text-left text-[10px] font-medium transition-colors text-muted-foreground"
              >
                {preset.icon}
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask about your architecture..."
            className="min-h-[40px] max-h-20 py-2 px-3 resize-none bg-background border-border text-[11px] rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 h-6 w-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
