"use client"

import type React from "react"
import { motion } from "framer-motion"
import { 
  FiServer, 
  FiZap, 
  FiCpu, 
  FiDatabase, 
  FiLayers, 
  FiGlobe, 
  FiShield, 
  FiLock, 
  FiKey, 
  FiActivity, 
  FiRadio, 
  FiFileText, 
  FiCode, 
  FiAnchor, 
  FiTerminal, 
  FiShare2, 
  FiX, 
  FiTrash2, 
  FiSave,
  FiBox
} from "react-icons/fi"
import { LuBoxes, LuHardDrive, LuNetwork, LuTrash2 } from "react-icons/lu"
import { HiOutlineCube } from "react-icons/hi2"
import type { CanvasComponent } from "@/types/architecture"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  gcpRegions,
  machineTypes,
  functionMemory,
  sqlInstanceTypes,
  autoscaleOptions,
  minInstanceOptions,
  maxInstanceOptions,
} from "@/lib/devops-components"
import { Save, X } from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Server: FiServer,
  Zap: FiZap,
  Container: LuBoxes,
  Cpu: FiCpu,
  Box: HiOutlineCube,
  HardDrive: LuHardDrive,
  Database: FiDatabase,
  Layers: FiLayers,
  Network: LuNetwork,
  Globe: FiGlobe,
  Shield: FiShield,
  Lock: FiLock,
  Key: FiKey,
  Activity: FiActivity,
  Radio: FiRadio,
  RadioReceiver: FiRadio,
  FileText: FiFileText,
  Code: FiCode,
  Anchor: FiAnchor,
  Terminal: FiTerminal,
  Share2: FiShare2,
}

interface ConfigPanelProps {
  component: CanvasComponent
  onUpdate: (updates: Partial<CanvasComponent>) => void
  onClose: () => void
  onDelete: () => void
  className?: string
  floating?: boolean
}

const getConfigFields = (
  type: string,
): { label: string; key: string; type: string; options?: { value: string; label: string }[] }[] => {
  switch (type) {
    case "compute-engine":
      return [
        {
          label: "Machine Type",
          key: "machineType",
          type: "dropdown",
          options: machineTypes.map((m) => ({ value: m.value, label: m.label })),
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        {
          label: "Disk Size (GB)",
          key: "diskSize",
          type: "dropdown",
          options: [
            { value: "10", label: "10 GB" },
            { value: "20", label: "20 GB" },
            { value: "50", label: "50 GB" },
            { value: "100", label: "100 GB" },
            { value: "200", label: "200 GB" },
            { value: "500", label: "500 GB" },
          ],
        },
        {
          label: "Disk Type",
          key: "diskType",
          type: "dropdown",
          options: [
            { value: "pd-standard", label: "Standard (HDD)" },
            { value: "pd-balanced", label: "Balanced (SSD)" },
            { value: "pd-ssd", label: "SSD" },
          ],
        },
        { label: "Autoscaling", key: "autoscale", type: "dropdown", options: autoscaleOptions },
        { label: "Min Instances", key: "minInstances", type: "dropdown", options: minInstanceOptions },
        { label: "Max Instances", key: "maxInstances", type: "dropdown", options: maxInstanceOptions },
      ]
    case "cloud-functions":
      return [
        {
          label: "Runtime",
          key: "runtime",
          type: "dropdown",
          options: [
            { value: "nodejs20", label: "Node.js 20" },
            { value: "nodejs18", label: "Node.js 18" },
            { value: "python312", label: "Python 3.12" },
            { value: "python311", label: "Python 3.11" },
            { value: "go121", label: "Go 1.21" },
            { value: "java17", label: "Java 17" },
          ],
        },
        { label: "Memory", key: "memory", type: "dropdown", options: functionMemory },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        {
          label: "Timeout (seconds)",
          key: "timeout",
          type: "dropdown",
          options: [
            { value: "30", label: "30 seconds" },
            { value: "60", label: "1 minute" },
            { value: "120", label: "2 minutes" },
            { value: "300", label: "5 minutes" },
            { value: "540", label: "9 minutes" },
          ],
        },
        { label: "Min Instances", key: "minInstances", type: "dropdown", options: minInstanceOptions },
        { label: "Max Instances", key: "maxInstances", type: "dropdown", options: maxInstanceOptions },
      ]
    case "cloud-run":
      return [
        { label: "Memory", key: "memory", type: "dropdown", options: functionMemory },
        {
          label: "CPU",
          key: "cpu",
          type: "dropdown",
          options: [
            { value: "1", label: "1 vCPU" },
            { value: "2", label: "2 vCPUs" },
            { value: "4", label: "4 vCPUs" },
            { value: "8", label: "8 vCPUs" },
          ],
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        { label: "Autoscaling", key: "autoscale", type: "dropdown", options: autoscaleOptions },
        { label: "Min Instances", key: "minInstances", type: "dropdown", options: minInstanceOptions },
        { label: "Max Instances", key: "maxInstances", type: "dropdown", options: maxInstanceOptions },
      ]
    case "gke":
      return [
        {
          label: "Node Machine Type",
          key: "machineType",
          type: "dropdown",
          options: machineTypes.map((m) => ({ value: m.value, label: m.label })),
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        {
          label: "Initial Node Count",
          key: "nodeCount",
          type: "dropdown",
          options: [
            { value: "1", label: "1 node" },
            { value: "2", label: "2 nodes" },
            { value: "3", label: "3 nodes" },
            { value: "5", label: "5 nodes" },
          ],
        },
        { label: "Autoscaling", key: "autoscale", type: "dropdown", options: autoscaleOptions },
        {
          label: "Min Nodes",
          key: "minNodes",
          type: "dropdown",
          options: [
            { value: "0", label: "0 nodes" },
            { value: "1", label: "1 node" },
            { value: "2", label: "2 nodes" },
            { value: "3", label: "3 nodes" },
          ],
        },
        {
          label: "Max Nodes",
          key: "maxNodes",
          type: "dropdown",
          options: [
            { value: "3", label: "3 nodes" },
            { value: "5", label: "5 nodes" },
            { value: "10", label: "10 nodes" },
            { value: "20", label: "20 nodes" },
          ],
        },
      ]
    case "app-engine":
      return [
        {
          label: "Runtime",
          key: "runtime",
          type: "dropdown",
          options: [
            { value: "nodejs20", label: "Node.js 20" },
            { value: "python312", label: "Python 3.12" },
            { value: "go121", label: "Go 1.21" },
            { value: "java17", label: "Java 17" },
            { value: "php82", label: "PHP 8.2" },
          ],
        },
        {
          label: "Instance Class",
          key: "instanceClass",
          type: "dropdown",
          options: [
            { value: "F1", label: "F1 (128 MB, 600 MHz)" },
            { value: "F2", label: "F2 (256 MB, 1.2 GHz)" },
            { value: "F4", label: "F4 (512 MB, 2.4 GHz)" },
            { value: "F4_1G", label: "F4_1G (1 GB, 2.4 GHz)" },
          ],
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        { label: "Autoscaling", key: "autoscale", type: "dropdown", options: autoscaleOptions },
        { label: "Min Instances", key: "minInstances", type: "dropdown", options: minInstanceOptions },
        { label: "Max Instances", key: "maxInstances", type: "dropdown", options: maxInstanceOptions },
      ]
    case "vpc-network":
      return [
        {
          label: "Subnet Mode",
          key: "subnetMode",
          type: "dropdown",
          options: [
            { value: "auto", label: "Auto Mode" },
            { value: "custom", label: "Custom Mode" },
          ],
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
      ]
    case "load-balancer":
      return [
        {
          label: "Type",
          key: "type",
          type: "dropdown",
          options: [
            { value: "http", label: "HTTP(S) Load Balancer" },
            { value: "tcp", label: "TCP Proxy" },
            { value: "ssl", label: "SSL Proxy" },
            { value: "network", label: "Network Load Balancer" },
            { value: "internal", label: "Internal Load Balancer" },
          ],
        },
        {
          label: "Region",
          key: "region",
          type: "dropdown",
          options: [{ value: "global", label: "Global" }, ...gcpRegions],
        },
        {
          label: "SSL Enabled",
          key: "sslEnabled",
          type: "dropdown",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
        },
      ]
    case "cloud-sql":
      return [
        {
          label: "Database Type",
          key: "databaseType",
          type: "dropdown",
          options: [
            { value: "postgresql", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
            { value: "sqlserver", label: "SQL Server" },
          ],
        },
        {
          label: "Instance Type",
          key: "instanceType",
          type: "dropdown",
          options: sqlInstanceTypes.map((s) => ({ value: s.value, label: s.label })),
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
        {
          label: "Storage Size",
          key: "storageSize",
          type: "dropdown",
          options: [
            { value: "10", label: "10 GB" },
            { value: "50", label: "50 GB" },
            { value: "100", label: "100 GB" },
            { value: "250", label: "250 GB" },
            { value: "500", label: "500 GB" },
            { value: "1000", label: "1 TB" },
          ],
        },
        {
          label: "High Availability",
          key: "highAvailability",
          type: "dropdown",
          options: [
            { value: "disabled", label: "Single Zone" },
            { value: "enabled", label: "High Availability" },
          ],
        },
      ]
    case "cloud-storage":
      return [
        {
          label: "Storage Class",
          key: "storageClass",
          type: "dropdown",
          options: [
            { value: "STANDARD", label: "Standard" },
            { value: "NEARLINE", label: "Nearline" },
            { value: "COLDLINE", label: "Coldline" },
            { value: "ARCHIVE", label: "Archive" },
          ],
        },
        {
          label: "Location",
          key: "region",
          type: "dropdown",
          options: [
            { value: "us", label: "United States (Multi-region)" },
            { value: "eu", label: "Europe (Multi-region)" },
            { value: "asia", label: "Asia (Multi-region)" },
            ...gcpRegions,
          ],
        },
        {
          label: "Versioning",
          key: "versioning",
          type: "dropdown",
          options: [
            { value: "disabled", label: "Disabled" },
            { value: "enabled", label: "Enabled" },
          ],
        },
      ]
    case "firestore":
      return [
        {
          label: "Mode",
          key: "mode",
          type: "dropdown",
          options: [
            { value: "native", label: "Native Mode" },
            { value: "datastore", label: "Datastore Mode" },
          ],
        },
        { label: "Location", key: "region", type: "dropdown", options: gcpRegions },
      ]
    case "memorystore":
      return [
        {
          label: "Engine",
          key: "engine",
          type: "dropdown",
          options: [
            { value: "redis", label: "Redis" },
            { value: "memcached", label: "Memcached" },
          ],
        },
        {
          label: "Tier",
          key: "tier",
          type: "dropdown",
          options: [
            { value: "basic", label: "Basic (No HA)" },
            { value: "standard", label: "Standard (HA)" },
          ],
        },
        {
          label: "Memory Size",
          key: "memorySizeGb",
          type: "dropdown",
          options: [
            { value: "1", label: "1 GB" },
            { value: "2", label: "2 GB" },
            { value: "4", label: "4 GB" },
            { value: "8", label: "8 GB" },
            { value: "16", label: "16 GB" },
          ],
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
      ]
    case "pub-sub":
      return [
        {
          label: "Message Retention (days)",
          key: "messageRetention",
          type: "dropdown",
          options: [
            { value: "1", label: "1 day" },
            { value: "7", label: "7 days" },
            { value: "14", label: "14 days" },
            { value: "31", label: "31 days" },
          ],
        },
        { label: "Region", key: "region", type: "dropdown", options: gcpRegions },
      ]
    case "cloud-logging":
      return [
        {
          label: "Retention (days)",
          key: "retentionDays",
          type: "dropdown",
          options: [
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "180", label: "180 days" },
            { value: "365", label: "1 year" },
            { value: "730", label: "2 years" },
          ],
        },
      ]
    default:
      return [{ label: "Region", key: "region", type: "dropdown", options: gcpRegions }]
  }
}

export function ConfigPanel({
  component,
  onUpdate,
  onClose,
  onDelete,
  className,
  floating = false,
}: ConfigPanelProps) {
  const [name, setName] = useState(component.name)
  const [config, setConfig] = useState(component.config)

  const IconComponent = ICON_MAP[component.icon] || FiBox
  const fields = getConfigFields(component.type)

  useEffect(() => {
    setName(component.name)
    setConfig(component.config)
  }, [component])

  const handleSave = () => {
    // Calculate cost based on config
    let cost = component.cost
    if (component.type === "compute-engine") {
      const machine = machineTypes.find((m) => m.value === config.machineType)
      if (machine) cost = machine.cost
    } else if (component.type === "cloud-sql") {
      const sql = sqlInstanceTypes.find((s) => s.value === config.instanceType)
      if (sql) cost = sql.cost
    }
    onUpdate({ name, config, cost })
    toast.success("Component configuration saved!")
    onClose()
  }

  const handleConfigChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <motion.div
      initial={floating ? { opacity: 0, scale: 0.95, y: -10 } : { x: 320, opacity: 0 }}
      animate={floating ? { opacity: 1, scale: 1, y: 0 } : { x: 0, opacity: 1 }}
      exit={floating ? { opacity: 0, scale: 0.95, y: -10 } : { x: 320, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: floating ? 380 : 300,
        damping: floating ? 28 : 30,
      }}
      className={cn(
        floating
          ? "absolute top-4 right-4 z-50 w-84 md:w-96 max-h-[calc(100%-2rem)] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 text-zinc-100"
          : "w-80 bg-zinc-950/95 border-l border-zinc-800 flex flex-col shrink-0 overflow-hidden shadow-xl text-zinc-100",
        className
      )}
    >
      <fieldset className="flex flex-col h-full m-0 p-0 border-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <legend className="font-bold text-zinc-100 text-sm leading-tight block">
                Configure {component.name}
              </legend>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                {component.category}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Component Name */}
          <div className="space-y-1.5">
            <Label htmlFor="component-name" className="text-xs font-semibold text-zinc-300">
              Component Label
            </Label>
            <Input
              id="component-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-9 focus:border-blue-500"
            />
          </div>

          {/* Cost display */}
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Estimated Monthly Cost</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {component.cost > 0 ? `$${component.cost.toFixed(2)}/mo` : "Free tier"}
            </span>
          </div>

          {/* Dynamic config fields */}
          <div className="space-y-3.5 pt-1">
            {fields.map((field) => {
              const value = String(config[field.key] || "")

              return (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-300">{field.label}</Label>
                  <Select value={value} onValueChange={(val) => handleConfigChange(field.key, val)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs h-9 w-full">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 z-100">
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 space-y-2">
          <Button
            type="button"
            onClick={handleSave}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs h-9"
          >
            <FiSave className="w-4 h-4" />
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="w-full gap-2 text-red-400 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 bg-transparent text-xs h-9"
          >
            <FiTrash2 className="w-4 h-4" />
            Delete Component
          </Button>
        </div>
      </fieldset>
    </motion.div>
  )
}
