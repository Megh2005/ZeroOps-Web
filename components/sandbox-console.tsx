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
    let resizeObserver: ResizeObserver | null = null

    const initTerminal = async () => {
      // Dynamic imports to prevent SSR execution failure
      const { Terminal } = await import("xterm")
      const { FitAddon } = await import("xterm-addon-fit")

      if (!active || !terminalRef.current) return

      // High-contrast, authentic Linux terminal configuration
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "block",
        theme: {
          background: "#050608",
          foreground: "#f8fafc",
          cursor: "#22c55e",
          cursorAccent: "#050608",
          selectionBackground: "#334155",
          selectionForeground: "#ffffff",
          black: "#1e293b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#38bdf8",
          white: "#ffffff",
          brightBlack: "#94a3b8",
          brightRed: "#ef4444",
          brightGreen: "#22c55e",
          brightYellow: "#eab308",
          brightBlue: "#38bdf8",
          brightMagenta: "#d8b4fe",
          brightCyan: "#7dd3fc",
          brightWhite: "#ffffff",
        },
        fontSize: 13,
        lineHeight: 1.45,
        fontFamily:
          '"JetBrains Mono", "Cascadia Code", "Fira Code", "Courier New", Courier, monospace',
        fontWeight: "500",
        fontWeightBold: "700",
        convertEol: true,
        scrollback: 1000,
        allowTransparency: false,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)

      // Fit with small delay so DOM render & layout complete
      setTimeout(() => {
        try {
          fitAddon.fit()
        } catch {}
      }, 50)

      // Auto-fit on resize using ResizeObserver
      if (terminalRef.current) {
        resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon.fit()
          } catch {}
        })
        resizeObserver.observe(terminalRef.current)
      }

      xtermInstanceRef.current = term

      // Initial Linux Shell Header
      term.writeln("\x1b[1;36m┌─────────────────────────────────────────────────────────────┐\x1b[0m")
      term.writeln("\x1b[1;36m│\x1b[0m  \x1b[1;32mZeroOps Isolated Linux Sandbox (Alpine 3.19 x86_64)\x1b[0m         \x1b[1;36m│\x1b[0m")
      term.writeln("\x1b[1;36m│\x1b[0m  \x1b[37mLocal Docker Container • Terraform v1.7.0 CLI Engine\x1b[0m       \x1b[1;36m│\x1b[0m")
      term.writeln("\x1b[1;36m└─────────────────────────────────────────────────────────────┘\x1b[0m\r\n")

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

    return () => {
      active = false
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="bg-[#090a0f] border-2 border-zinc-700/80 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Linux Terminal Window Chrome Titlebar */}
        <div className="px-4 py-3 bg-[#13151f] border-b border-zinc-700/80 flex items-center justify-between select-none">
          {/* Linux window buttons + Prompt Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block border border-red-700 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block border border-amber-700 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block border border-emerald-700 shadow-sm" />
            </div>

            <div className="flex items-center gap-2 pl-2 text-xs font-mono">
              <FiTerminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">root@zeroops-sandbox</span>
              <span className="text-zinc-500">:</span>
              <span className="text-cyan-400 font-bold">/workspace</span>
              <span className="text-zinc-400">#</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Alpine Linux 3.19
            </span>
            <button
              onClick={onClose}
              disabled={running}
              aria-label="Close terminal"
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors disabled:opacity-40"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Specifications & Telemetry Header */}
        <div className="p-4 bg-[#0c0d14] border-b border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 flex items-center gap-2.5">
            <FiTerminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[9px]">Environment</span>
              <span className="text-white font-bold">Alpine Linux 3.19</span>
            </div>
          </div>
          <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 flex items-center gap-2.5">
            <FiCpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[9px]">Binary</span>
              <span className="text-white font-bold">Terraform v1.7.0 CLI</span>
            </div>
          </div>
          <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 flex items-center gap-2.5">
            <FiClock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[9px]">Watchdog</span>
              <span className="text-white font-bold">5 Minutes Limit (300s)</span>
            </div>
          </div>
        </div>

        {/* Linux Shell Terminal Window (Spacious, high contrast, fixed height) */}
        <div className="flex-1 p-4 bg-[#050608] overflow-hidden flex flex-col">
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#050608] p-3 shadow-inner h-95">
            <div ref={terminalRef} className="w-full h-full" />
          </div>

          {/* Validation Metrics Status Banner */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-lg border-2 font-mono space-y-2 shadow-lg ${
                result.success
                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                  : "bg-rose-950/40 border-rose-500/60 text-rose-200"
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

              <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-200 pt-2 border-t border-white/10">
                <div>
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px] block">
                    Version
                  </span>
                  <span className="text-white font-bold">{tfVersion}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px] block">
                    Execution Time
                  </span>
                  <span className="text-white font-bold">{duration} ms</span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-black/80 border border-rose-500/40 p-3 rounded text-rose-300 text-xs leading-relaxed whitespace-pre-wrap select-text font-mono mt-2">
                  <span className="font-bold text-rose-400 block mb-1 text-[10px] uppercase tracking-wider">
                    Build Failure Reason:
                  </span>
                  {errorMsg}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Linux Terminal Footer Status Bar */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#10121a] flex items-center justify-between select-none">
          <div className="text-xs font-mono text-zinc-300 flex items-center gap-2">
            {running ? (
              <span className="flex items-center gap-2 text-cyan-300 font-bold">
                <FiLoader className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Running terraform build verification in Linux container...</span>
              </span>
            ) : result ? (
              <span className="text-zinc-200 flex items-center gap-2 font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${result.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span>Validation Finished (Exit Code {result.success ? "0" : "1"})</span>
              </span>
            ) : (
              <span className="text-zinc-400 flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                <span>Ready</span>
              </span>
            )}
          </div>

          <Button
            onClick={onClose}
            disabled={running}
            className="bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs h-8 px-4 rounded-md shadow transition-colors disabled:opacity-40"
          >
            [ Close Console ]
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
