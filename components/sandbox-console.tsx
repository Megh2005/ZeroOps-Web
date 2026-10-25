"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  FiTerminal,
  FiX,
  FiLoader,
  FiAlertTriangle,
  FiShield,
  FiCpu,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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

      // Authentic Linux Terminal Theme (High contrast, crisp monospace)
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "block",
        theme: {
          background: "#08090d",
          foreground: "#f8fafc",
          cursor: "#22c55e",
          selectionBackground: "#334155",
          selectionForeground: "#ffffff",
          black: "#1e293b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#38bdf8",
          white: "#f8fafc",
          brightBlack: "#64748b",
          brightRed: "#ef4444",
          brightGreen: "#22c55e",
          brightYellow: "#eab308",
          brightBlue: "#3b82f6",
          brightMagenta: "#a855f7",
          brightCyan: "#06b6d4",
          brightWhite: "#ffffff",
        },
        fontSize: 13,
        lineHeight: 1.45,
        fontFamily:
          '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, "Courier New", monospace',
        fontWeight: "500",
        letterSpacing: 0.3,
        convertEol: true,
        rows: 16,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      xtermInstanceRef.current = term

      // Initial Linux Boot & Shell Welcome Banner
      term.writeln("\x1b[1;36m=== ZeroOps Isolated Linux Sandbox (Alpine 3.19 x86_64) ===\x1b[0m")
      term.writeln("\x1b[90mPreparing local Docker container & mounting /workspace volume...\x1b[0m\r\n")

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
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
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
                    toast.success("Terraform build checked: 0 configuration errors found!")
                  }
                } else if (payload.type === "error") {
                  term.writeln(`\r\n\x1b[1;31m[Build Error] ${payload.data}\x1b[0m`)
                  setErrorMsg(payload.data)
                }
              } catch (e) {
                console.error("Failed to parse SSE payload", e)
              }
            }
          }
        }
      } catch (err: any) {
        term.writeln(`\r\n\x1b[1;31m[Sandbox Error] ${err.message}\x1b[0m`)
        setErrorMsg(err.message || "An unexpected validation crash occurred.")
      } finally {
        setRunning(false)
      }
    }

    initTerminal()

    const handleResize = () => {
      if (xtermInstanceRef.current) {
        try {
          const fitAddon = new (require("xterm-addon-fit").FitAddon)()
          xtermInstanceRef.current.loadAddon(fitAddon)
          fitAddon.fit()
        } catch {}
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      active = false
      window.removeEventListener("resize", handleResize)
      if (reader) {
        try {
          reader.cancel()
        } catch {}
      }
      if (xtermInstanceRef.current) {
        try {
          xtermInstanceRef.current.dispose()
        } catch {}
      }
    }
  }, [code])

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="bg-[#0b0c10] border border-zinc-800 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Linux Terminal Window Titlebar */}
        <div className="px-4 py-3 bg-[#12131a] border-b border-zinc-800 flex items-center justify-between select-none">
          {/* Linux window buttons */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-black/30 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-black/30 shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-black/30 shadow-sm" />
            <span className="ml-3 text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <FiTerminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">root@zeroops-sandbox</span>
              <span className="text-zinc-600">:</span>
              <span className="text-cyan-400 font-bold">/workspace</span>
              <span className="text-zinc-600">#</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-mono">
              Alpine Linux 3.19
            </span>
            <button
              onClick={onClose}
              disabled={running}
              aria-label="Close terminal"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-40"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Console Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#08090d]">
          {/* Environment specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
            <div className="p-2.5 bg-[#0e1017] rounded-lg border border-zinc-800/80 flex items-center gap-2.5">
              <FiTerminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">Distro</span>
                <span className="text-zinc-200 font-bold">Alpine Linux (x86_64)</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#0e1017] rounded-lg border border-zinc-800/80 flex items-center gap-2.5">
              <FiCpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">Engine</span>
                <span className="text-zinc-200 font-bold">Terraform CLI in Docker</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#0e1017] rounded-lg border border-zinc-800/80 flex items-center gap-2.5">
              <FiClock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[9px]">Watchdog</span>
                <span className="text-zinc-200 font-bold">120 Seconds Limit</span>
              </div>
            </div>
          </div>

          {/* xterm.js Terminal Container (Styled as authentic Linux shell) */}
          <div className="border border-zinc-800/90 bg-[#08090d] rounded-lg overflow-hidden shadow-inner p-3 min-h-80">
            <div ref={terminalRef} className="w-full h-full" />
          </div>

          {/* Validation Metrics Status Banner */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border font-mono space-y-2.5 shadow-lg ${
                result.success
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/20 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <FiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <FiAlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  {result.success
                    ? "Sandbox Build Validation: Passed (0 Errors)"
                    : "Sandbox Build Validation: Failed (Build Errors Detected)"}
                </h4>
              </div>

              <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300 pt-1 border-t border-white/5">
                <div>
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">
                    Version
                  </span>
                  <span className="text-zinc-200">{tfVersion}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">
                    Execution Time
                  </span>
                  <span className="text-zinc-200">{duration} ms</span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-[#0b0c10] border border-rose-500/20 p-3 rounded text-rose-400 text-xs leading-relaxed whitespace-pre-wrap select-text font-mono">
                  <span className="font-bold text-rose-300 block mb-1 text-[9px] uppercase tracking-wider">
                    Build Failure Reason:
                  </span>
                  {errorMsg}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Linux Terminal Status Bar Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#0e1017] flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            {running ? (
              <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                <FiLoader className="w-3.5 h-3.5 animate-spin" />
                <span>running terraform build check in container...</span>
              </span>
            ) : result ? (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${result.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span>Validation finished with code {result.success ? "0 (SUCCESS)" : "1 (BUILD_ERROR)"}</span>
              </span>
            ) : (
              <span className="text-zinc-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span>Shell Idle</span>
              </span>
            )}
          </div>
          <Button
            onClick={onClose}
            disabled={running}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono font-bold text-xs h-8 px-4 rounded-md border border-zinc-700 transition-colors"
          >
            [ Close Console ]
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
