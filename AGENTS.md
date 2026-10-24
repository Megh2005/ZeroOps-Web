# AGENTS.md — ZeroOps Developer & AI Agent Context Guide

> **MANDATORY INSTRUCTION FOR ALL AGENTS & DEVELOPERS (NICK'S DIRECTIVE)**
> 
> 1. **ALL ICONS MUST BE FROM REACT-ICONS**: Every icon used across this codebase must be imported from the `react-icons` package (e.g., `react-icons/fi`, `react-icons/fa6`, `react-icons/lu`, `react-icons/hi2`, `react-icons/vsc`, `react-icons/ri`, `react-icons/tb`, `react-icons/md`, `react-icons/bi`, etc.).
> 2. **SPARKLE ICON IS STRICTLY PROHIBITED**: The usage of any sparkle, sparkles, magic wand, or star-burst icon (such as `Sparkles`, `HiSparkles`, `BsStars`, `LuSparkles`, `GiSparkles`, `WiStars`, etc.) is **strictly and completely forbidden** across all pages, components, buttons, badges, modals, and AI assistant interfaces. Do NOT introduce or re-introduce sparkle icons anywhere.
> 3. **ALL ICONS MUST BE FORMAL AND WELL VISIBLE**: Every icon must be formal, professional, enterprise-grade, engineering-focused, and clearly visible against dark backgrounds (`#09090b` / `#050505`). Use high-contrast colors, clear stroke weights, and appropriate dimensions (`w-4 h-4`, `w-5 h-5`, etc.).
> 4. **MIGRATION FROM LEGACY ICONS**: While the codebase historically contained `lucide-react` imports, any new code, refactored components, or modified files **must strictly adhere to `react-icons`** and eliminate any forbidden icons immediately upon touching the file.

---

## 1. Project Overview & Architecture

**ZeroOps** is an enterprise-grade, no-code DevOps automation and cloud infrastructure orchestration platform focused on Google Cloud Platform (GCP). It abstracts Infrastructure as Code (IaC) by enabling engineers and cloud architects to visually design architectures via an interactive drag-and-drop canvas, and automatically produces production-grade Terraform HCL, validates it within a local Docker sandbox, optimizes cost/security via Google Gemini AI, and provisions live resources onto Google Cloud Platform.

### Key Technological Pillars:
- **Framework**: Next.js 16 (App Router, Turbopack, Standalone Output) + React 19 + TypeScript.
- **Styling**: Tailwind CSS v4, PostCSS, OKLCH color palettes, custom gradients, Framer Motion animations.
- **Typography**: Google Font Roboto Slab (`Roboto_Slab`, `--font-roboto-slab`).
- **AI Engine**: Google Gemini API (`@google/generative-ai`), default model `gemini-3.1-flash-lite` (configured in `lib/gemini.ts`).
- **Database & State**: Google Firebase Firestore (Collections: `users`, `deployments`, `commits`).
- **Authentication**: NextAuth.js v4 with GitHub Provider (scopes: `read:user`, `user:email`, `repo`).
- **Cloud Integration**: Google Cloud Platform OAuth 2.0 (scopes: `openid`, `email`, `https://www.googleapis.com/auth/cloud-platform`).
- **Sandbox Execution**: Local Docker Engine (`dockerode`, `tar-stream`) running isolated Alpine Linux containers with Terraform v1.7.0 CLI.
- **Terminal & Observability**: Xterm.js v5 (`xterm`, `xterm-addon-fit`), Server-Sent Events (SSE) streaming for real-time validation and GCP deployments.

---

## 2. Mandatory Icon Standards & Design Principles

### 2.1 The Icon Standard (`react-icons`)
All future icons must be imported from `react-icons`. Recommended icon sub-libraries:
- **Feather Icons (`react-icons/fi`)**: Clean, minimalist, formal lines (e.g., `FiServer`, `FiCpu`, `FiDatabase`, `FiShield`, `FiActivity`, `FiTerminal`, `FiLayers`).
- **Lucide Icons from React Icons (`react-icons/lu`)**: Modern engineering aesthetic (e.g., `LuBoxes`, `LuNetwork`, `LuSplit`, `LuHardDrive`).
- **FontAwesome 6 (`react-icons/fa6`)**: Broad enterprise coverage (e.g., `FaGoogle`, `FaGithub`, `FaDocker`, `FaAws`).
- **VS Code Icons (`react-icons/vsc`)**: Ideal for code, commits, diffs, and terminal elements (e.g., `VscGitCommit`, `VscSourceControl`, `VscJson`).
- **HeroIcons 2 (`react-icons/hi2`)**: High clarity outline/solid glyphs (`HiOutlineCommandLine`, `HiOutlineCube`).

### 2.2 Prohibited Icons Checklist
- ❌ `Sparkles` / `LuSparkles` / `FiSparkles`
- ❌ `HiSparkles` / `HiOutlineSparkles`
- ❌ `BsStars` / `BsMagic`
- ❌ `AiOutlineStar` (when used in place of AI magic)
- ❌ Any "magic glitter" or whimsical wand iconography.
- ✅ **Replacement for AI / Intelligence Actions**: Use formal, technical icons such as `FiCpu` (Processor), `LuBrainCircuit` / `LuBot` (Agent), `FiTerminal` (CLI/Execution), `FiZap` (Compute/Velocity), `FiLayers` (Synthesis), or `FiActivity` (Telemetry).

### 2.3 Visibility & Styling Rules
- Icon contrast must be tested on both pure black (`#050505`) and dark zinc backgrounds (`#09090b` / `#18181b`).
- Avoid low-opacity icons (`opacity-20` or muted grays below `#71717a` on dark surfaces).
- Standard sizes:
  - Mini tags/badges: `w-3.5 h-3.5`
  - Inline buttons: `w-4 h-4`
  - Cards / section headers: `w-5 h-5`
  - Hero / feature icons: `w-6 h-6` to `w-8 h-8`

---

## 3. Directory & File Reference

```
ZeroOps/
├── app/
│   ├── ai-builder/page.tsx               # AI Natural Language Architecture Builder
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # GitHub OAuth & User Profile sync
│   │   │   └── gcp/
│   │   │       ├── route.ts              # GCP OAuth redirect initiator
│   │   │       └── callback/route.ts     # GCP OAuth code exchange & Firestore storage
│   │   ├── commits/
│   │   │   ├── route.ts                  # Fetch / delete Git commit audit logs
│   │   │   └── revert/route.ts           # Revert GitHub file commit directly via GitHub API
│   │   ├── gcp/
│   │   │   ├── deploy/route.ts           # Live GCP deployment stream (SSE) + GCS bucket proof
│   │   │   ├── deployments/route.ts      # Query deployment history from Firestore
│   │   │   ├── disconnect/route.ts       # Unlink GCP tokens from user profile
│   │   │   └── projects/route.ts         # List active GCP projects via Cloud Resource Manager
│   │   ├── repos/
│   │   │   ├── create/route.ts           # Create new GitHub repository
│   │   │   ├── push/route.ts             # Commit & push file changes to GitHub
│   │   │   └── [id]/
│   │   │       ├── route.ts              # Fetch repository details, file trees, and commits
│   │   │       └── file/route.ts         # GET/PUT/DELETE specific file in repo
│   │   ├── sandbox/
│   │   │   └── validate/route.ts         # Stream Docker sandbox Terraform test (SSE)
│   │   └── user/
│   │       ├── profile/route.ts          # Read and update user onboarding/profile
│   │       └── sync-repos/route.ts       # Refresh repositories from GitHub to Firestore
│   ├── auth/page.tsx                     # Authentication screen (GitHub Sign-in)
│   ├── builder/page.tsx                  # Drag-and-drop Visual Infrastructure Builder
│   ├── code-to-builder/page.tsx          # Reverse engineer Terraform HCL into Visual Canvas
│   ├── commits/page.tsx                  # Commit timeline, code diffs, and instant rollback
│   ├── dashboard/page.tsx                # Central Hub: Repositories, metrics, activity, quick-launch
│   ├── devops/page.tsx                   # Multi-Cloud Terraform Migrator & GCP Architecture Suggester
│   ├── docs/page.tsx                     # ZeroOps platform documentation & guides
│   ├── onboarding/page.tsx               # 3-step User Onboarding: Use case, Team size, Domain
│   ├── profile/page.tsx                  # User Profile & GCP Account Link Management
│   ├── repos/[id]/page.tsx               # Repo Explorer: File tree, markdown viewer, file editor
│   ├── terraform-view/page.tsx           # Terraform Studio: Inspect, Sandbox Test, AI Debug, Live Deploy
│   ├── globals.css                       # Global CSS, Tailwind theme variables, OKLCH tokens
│   ├── layout.tsx                        # Root layout, Google Font Roboto Slab, Toast provider, AuthGuard
│   └── page.tsx                          # Public Landing Page & Feature Showcase
├── components/
│   ├── ui/                               # Radix UI + Tailwind primitive components
│   │   ├── alert.tsx                     # Alert container
│   │   ├── avatar.tsx                    # User avatar with fallback
│   │   ├── button.tsx                    # Button with variants (default, outline, ghost, destructive)
│   │   ├── card.tsx                      # Card, CardHeader, CardTitle, CardContent
│   │   ├── dropdown-menu.tsx             # Popover dropdowns
│   │   ├── floating-3d-particles.tsx     # 3D canvas particle hero animation
│   │   ├── input.tsx                     # Form text input
│   │   ├── label.tsx                     # Form field label
│   │   ├── select.tsx                    # Select trigger and options
│   │   └── textarea.tsx                  # Multi-line text input
│   ├── architecture-builder.tsx          # Canvas orchestrator, component state, auto-save
│   ├── auth-guard.tsx                    # Route protection, onboarding redirection logic
│   ├── auth-provider.tsx                 # NextAuth session + Firestore profile synchronization
│   ├── canvas-node.tsx                   # Draggable canvas node representing cloud resources
│   ├── canvas.tsx                        # Interactive grid, drag-and-drop target, connection links
│   ├── chat-panel.tsx                    # Sidebar AI Architecture assistant for active canvas
│   ├── component-card.tsx                # Draggable card item from component library
│   ├── config-panel.tsx                  # Side drawer for configuring selected node properties
│   ├── connection-line.tsx               # SVG Bezier curve connecting two architecture nodes
│   ├── markdown-renderer.tsx             # Markdown parser with syntax highlighting & card groups
│   ├── navigation-dock.tsx               # Universal bottom navigation pill dock with large react-icons
│   ├── sandbox-console.tsx               # Embedded Xterm.js terminal for Docker sandbox output
│   ├── sidebar.tsx                       # GCP component category picker (Compute, Storage, Network, etc.)
│   ├── theme-provider.tsx                # Dark / Light theme provider (ZeroOps is optimized for Dark)
│   ├── toolbar.tsx                       # Canvas top toolbar: Validation, Cost, Terraform export
│   └── validation-modal.tsx              # Architecture linting modal showing errors & warnings
├── lib/
│   ├── auth-client.ts                    # Client-side logout and profile saving helpers
│   ├── devops-components.ts              # Catalog of 24+ Google Cloud components, specs, pricing, regions
│   ├── example-architecture.ts           # Default 3-tier GCP architecture (Load Balancer -> VM -> SQL)
│   ├── firebase.ts                       # Firebase App & Firestore initialization (`zero-ops-citadel`)
│   ├── gcp.ts                            # Google Cloud OAuth access token auto-refresh utility
│   ├── gemini.ts                         # Server actions powering all AI synthesis and debugging
│   ├── repo-cache.ts                     # In-memory TTL cache for GitHub repository metadata
│   ├── sandbox.ts                        # Dockerode sandbox orchestration for `terraform validate`
│   ├── terraform-generator.ts            # HCL code synthesis engine converting visual state to Terraform
│   ├── utils.ts                          # `cn` clsx/tailwind-merge & connection anchor calculation
│   └── validator.ts                      # Heuristic architecture validation rules (isolated nodes, VPC, IAM)
├── types/
│   └── architecture.ts                   # Core interfaces: CanvasComponent, Connection, DevOpsComponent
├── Dockerfile.sandbox                    # Alpine Linux container definition with Terraform v1.7.0 CLI
├── next.config.ts                        # Next.js configuration (standalone, serverExternalPackages)
├── package.json                          # Dependencies & NPM scripts
└── tsconfig.json                         # TypeScript compiler configuration & path aliases (`@/*`)
```

---

## 4. Deep-Dive: Core Subsystems & Logic

### 4.1 Architecture Canvas Engine (`components/`)
- **Canvas State**: `components: CanvasComponent[]` and `connections: Connection[]`.
- **Coordinate System**: Grid snapping at 20px (`GRID_SIZE = 20`).
- **Anchors**: Nodes calculate closest anchors (`top`, `right`, `bottom`, `left`) dynamically using Euclidean distance (`lib/utils.ts` -> `calculateClosestAnchors`).
- **Connection Lines**: Smooth SVG cubic bezier curves (`d="M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"`).
- **Session Persistence**: Canvas state auto-saves to browser `sessionStorage` under `zeroops_canvas_components` and `zeroops_canvas_connections`.
- **Import Channel**: `sessionStorage.getItem("imported_architecture")` is consumed on mount if coming from AI Builder or Code-to-Builder.

### 4.2 Supported Cloud Components (`lib/devops-components.ts`)
24+ GCP Services grouped into 5 categories:
1. **Compute**: `compute-engine` (VMs), `cloud-functions` (Serverless), `cloud-run` (Containers), `gke` (Kubernetes), `app-engine`.
2. **Networking**: `vpc-network`, `load-balancer`, `cloud-cdn`, `cloud-dns`, `api-gateway`.
3. **Storage & Databases**: `cloud-storage` (GCS), `cloud-sql` (Postgres/MySQL), `firestore`, `memorystore` (Redis), `bigtable`, `artifact-registry`.
4. **Security & Identity**: `firewall`, `iam`, `cloud-armor` (WAF/DDoS), `secret-manager`.
5. **Observability & Messaging**: `cloud-monitoring`, `cloud-logging`, `pub-sub`, `cloud-trace`.

Each component specifies:
- `defaultConfig`: Key-value configuration defaults.
- `baseCost`: Monthly estimated USD cost based on machine sizing.
- `allowedConnections`: Whitelist of compatible resource connections for rule-based linting.

### 4.3 AI Intelligence Engine (`lib/gemini.ts`)
Powered by Google Gemini (`gemini-3.1-flash-lite`). Functions:
1. `debugTerraform(code)`: Detects GCP misconfigurations, syntax errors, and security vulnerabilities; outputs corrected HCL without comments.
2. `getArchitecturalSuggestions(description)`: Takes user requirements and outputs recommended GCP services with text-based ASCII architecture diagrams.
3. `validateTerraform(code)`: Fast structural validation; checks cost optimizations and flags `COST_OPTIMIZATION_REQUIRED`.
4. `optimizeTerraform(code, strategies)`: Returns raw JSON `{ "optimizedCode": "...", "tips": "..." }` stripping comments and applying selected cost-saving techniques.
5. `terraformToArchitecture(code)`: Reverse-engineers raw Terraform HCL into `{ components, connections }` JSON for canvas visualization.
6. `migrateTerraform(code, fromCloud, toCloud)`: Translates AWS/DigitalOcean Terraform into Google Cloud Terraform HCL.
7. `chatAboutArchitecture(message, components, connections, history)`: Interactive canvas chatbot evaluating active canvas layout.
8. `generateArchitectureFromPrompt(prompt, history, components, connections)`: Synthesizes or iteratively edits visual components and connections from natural language.

### 4.4 Local Docker Sandbox Engine (`lib/sandbox.ts` & `Dockerfile.sandbox`)
- Runs `dockerode` communicating with the local Docker daemon:
  - Windows: `//./pipe/docker_engine`
  - Linux/macOS: `/var/run/docker.sock`
  - Remote: `process.env.DOCKER_HOST`
- Spins up an Alpine container with Terraform v1.7.0 CLI.
- Creates an in-memory tarball containing `main.tf` and copies it into container `/workspace`.
- Runs sequential pipeline:
  1. `terraform fmt -check` (Formatting verification)
  2. `terraform init -backend=false` (Provider initialization)
  3. `terraform validate -no-color` (Schema and syntax validation)
- Streams outputs directly to the client via Server-Sent Events (SSE) into `SandboxConsole` (`xterm.js`).

### 4.5 Live GCP Deployment Pipeline (`app/api/gcp/deploy/route.ts`)
- Authenticates using user's refreshed Google OAuth access token (`lib/gcp.ts`).
- Verifies required Google APIs via `serviceusage.googleapis.com`.
- Streams Terraform plan and execution logs via SSE.
- Executes real GCS API call (`POST https://storage.googleapis.com/storage/v1/b?project=...`) to provision a verified deployment bucket and uploads `zeroops-deployment.tf` as cryptographic proof.
- Generates SHA-256 verification hash and saves deployment metadata to Firestore `deployments` collection.

### 4.6 GitHub & Commit Rollback System
- **NextAuth GitHub Scope**: Includes full `repo` permissions to allow repository creation, file browsing, and code commits.
- **Repository Detail View** (`app/repos/[id]/page.tsx`): Direct branch switching, directory navigation, file reading, file editing, and direct commits to GitHub.
- **Commit Ledger** (`app/api/commits/route.ts` & `app/commits/page.tsx`): Tracks all commits pushed via ZeroOps, saving `previousContent` and `sha`.
- **Instant Rollback** (`app/api/commits/revert/route.ts`): Reverting an update restores the exact previous content; reverting a creation deletes the file on GitHub.

---

## 5. Authentication, Guards & Profile Lifecycle

1. **Unauthenticated User**:
   - Allowed routes: `/`, `/auth`, `/docs`.
   - Accessing any protected route redirects immediately to `/auth`.
2. **Authenticated without Profile**:
   - If user is logged in via GitHub but `profile.useCase` is missing, `AuthGuard` forcibly redirects to `/onboarding`.
3. **Completed Onboarding**:
   - `onboarding/page.tsx` collects `useCase`, `teamSize`, and `fieldOfWork`, sending them to `/api/user/profile`.
   - Once completed, accessing `/auth` or `/onboarding` redirects directly to `/dashboard`.
4. **Session Normalization**:
   - `AuthProvider` normalizes GitHub session properties to match standard User fields (`uid`, `displayName`, `photoURL`, `username`).

---

## 6. Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key for AI synthesis and debugging routines. |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret. |
| `NEXTAUTH_SECRET` | NextAuth cryptographic session encryption secret. |
| `GITHUB_PRIVATE_ACCESS_TOKEN` | System-level fallback token for GitHub API interactions. |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Web Application Client ID. |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Web Application Client Secret. |
| `NEXTAUTH_URL` | Base application URL (defaults to `http://localhost:3000` in development). |

---

## 7. Guidelines for Modifying Code

1. **Icon Imports**:
   - **DO NOT** import icons from `lucide-react` in new files or during edits.
   - **DO** use `react-icons` (e.g. `import { FiServer, FiCpu } from "react-icons/fi"`).
   - **NEVER** use Sparkles or magic wand icons.
2. **Component Customization**:
   - Retain dark mode styling (`bg-[#050505]`, `bg-[#09090b]`, `border-white/10`, `text-zinc-100`).
   - Use `Roboto Slab` typography exclusively throughout the entire website.
   - Ensure interactive buttons have feedback (`hover:opacity-80`, `active:scale-95`, or Framer Motion tap animations).
3. **TypeScript Types**:
   - Always reference types from `@/types/architecture` for canvas objects.
   - Do not bypass type safety with `any` unless working with dynamic external API responses.
4. **API Route Error Handling**:
   - All API routes must return JSON with `{ success: false, error: string }` and an appropriate HTTP status code (`400`, `401`, `404`, `500`).
   - Catch blocks must log errors to console for server debugging.
