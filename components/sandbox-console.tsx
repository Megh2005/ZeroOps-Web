"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { FiTerminal, FiX, FiLoader, FiAlertTriangle, FiShield, FiCpu, FiHardDrive, FiClock } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TerminalIcon, X } from "lucide-react"

// We use xterm dynamically inside useEffect because it accesses window/DOM and fails during Next.js SSR build
interface SandboxConsoleProps {
  code: string
  onClose: () => void
}

export function SandboxConsole({ code, onClose }: SandboxConsoleProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [tfVersion, setTfVersion] = useState("")
  const [duration, setDuration] = useState<number | null>(null)
  const xtermInstanceRef = useRef<any>(null)

  useEffect(() => {
    let active = true
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    const initTerminal = async () => {
      // Dynamic imports to prevent SSR execution failure
      const { Terminal } = await import("xterm")
      const { FitAddon } = await import("xterm-addon-fit")
      // @ts-ignore
      await import("xterm/css/xterm.css")

      if (!active || !terminalRef.current) return

      // Configure a gorgeous dark premium terminal theme
      const term = new Terminal({
        cursorBlink: true,
        theme: {
          background: "#09090b",
          foreground: "#a1a1aa",
          cursor: "#a1a1aa",
          selectionBackground: "#3f3f46",
          black: "#09090b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#f4f4f5"
        },
        fontSize: 12,
        fontFamily: 'JetBrains Mono, Fira Code, Monaco, Courier New, monospace',
        convertEol: true,
        rows: 15
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      xtermInstanceRef.current = term
      term.writeln("\x1b[35m=== ZeroOps Isolated Terraform Sandbox Validation Engine ===\x1b[0m")
      term.writeln("\x1b[90mPreparing sandboxed container environment...\x1b[0m")

      // Trigger Validation Execution
      runValidation(term)
    }

    const runValidation = async (term: any) => {
      setRunning(true)
      setResult(null)
      setErrorMsg("")
      setTfVersion("")
      setDuration(null)

      try {
        const response = await fetch("/api/sandbox/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || "Failed to launch sandbox validation.")
        }

        if (!response.body) {
          throw new Error("Validation response stream not readable.")
        }

        reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (active) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const payload = JSON.parse(line.substring(6))
                if (payload.type === "log") {
                  term.write(payload.data)
                } else if (payload.type === "result") {
                  setResult(payload.data)
                  setTfVersion(payload.data.version)
                  setDuration(payload.data.durationMs)
                  if (!payload.data.success) {
                    setErrorMsg(payload.data.error || "Sandbox validation failed.")
                  } else {
                    toast.success("Terraform code validated successfully inside sandbox!")
                  }
                } else if (payload.type === "error") {
                  term.writeln(`\r\n\x1b[31m[Error] ${payload.data}\x1b[0m`)
                  setErrorMsg(payload.data)
                }
              } catch (e) {
                console.error("Failed to parse SSE payload", e)
              }
            }
          }
        }
      } catch (err: any) {
        term.writeln(`\r\n\x1b[31m[Sandbox Exception] ${err.message}\x1b[0m`)
        setErrorMsg(err.message || "An unexpected validation crash occurred.")
      } finally {
        setRunning(false)
      }
    }

    initTerminal()

    // Handle resizing
    const handleResize = () => {
      if (xtermInstanceRef.current) {
        try {
          // Re-fit xterm size
          const fitAddon = xtermInstanceRef.current._addons.find((a: any) => a.fit)
          if (fitAddon) fitAddon.fit()
        } catch (e) {}
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      active = false
      window.removeEventListener("resize", handleResize)
      if (reader) {
        try {
          reader.cancel()
        } catch (e) {}
      }
      if (xtermInstanceRef.current) {
        try {
          xtermInstanceRef.current.dispose()
        } catch (e) {}
      }
    }
  }, [code])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <FiTerminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                Terraform Sandbox Validation Engine
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">Isolated dry-run environment validator (Alpine + Dockerode)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Console Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Environment specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[11px]">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center gap-2.5">
              <FiCpu className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px] mb-0.5">CPU Core Limit</span>
                <span className="text-zinc-200 font-bold">1 Core (Shared)</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center gap-2.5">
              <FiHardDrive className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px] mb-0.5">RAM Limits</span>
                <span className="text-zinc-200 font-bold">512 MB Isolation</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center gap-2.5">
              <FiClock className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px] mb-0.5">Execution Timeout</span>
                <span className="text-zinc-200 font-bold">120 Seconds Limit</span>
              </div>
            </div>
          </div>

          {/* xterm.js Terminal Container */}
          <div className="border border-zinc-800 bg-[#09090b] rounded-xl overflow-hidden shadow-2xl p-4 min-h-75">
            <div ref={terminalRef} className="w-full h-full" />
          </div>

          {/* Validation Metrics Status Banner */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl border font-mono space-y-3 shadow-lg ${
                result.success
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-950/20 border-rose-500/30 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {result.success ? (
                  <FiShield className="w-5 h-5" />
                ) : (
                  <FiAlertTriangle className="w-5 h-5" />
                )}
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  {result.success ? "Sandbox dry-run Passed" : "Sandbox dry-run Failed"}
                </h4>
              </div>

              <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300">
                <div>
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Terraform version:</span>
                  {tfVersion}
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Duration:</span>
                  {duration} ms
                </div>
              </div>

              {errorMsg && (
                <div className="bg-zinc-950 border border-zinc-850/80 p-3 rounded-lg text-rose-500 leading-relaxed text-xs wrap-break-word whitespace-pre-wrap select-text">
                  <span className="font-bold text-rose-400 block mb-1 uppercase tracking-wider text-[9px]">Validation Failure Reason:</span>
                  {errorMsg}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <div className="text-[10px] font-mono text-zinc-500">
            {running ? (
              <span className="flex items-center gap-1.5">
                <FiLoader className="w-3 h-3 animate-spin text-purple-400" />
                Validating syntax logic...
              </span>
            ) : (
              "Idle"
            )}
          </div>
          <Button
            onClick={onClose}
            disabled={running}
            className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold text-xs h-9 px-4 rounded-xl"
          >
            Close Sandbox Console
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
