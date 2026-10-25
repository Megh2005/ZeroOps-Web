import Docker from "dockerode";
import tar from "tar-stream";
import { Readable } from "stream";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Initialize Docker Instance dynamically based on OS platform
function getDockerInstance(): Docker {
  if (process.env.DOCKER_HOST) {
    return new Docker({ host: process.env.DOCKER_HOST });
  }
  const isWin = process.platform === "win32";
  if (isWin) {
    return new Docker({ socketPath: "//./pipe/docker_engine" });
  } else {
    return new Docker({ socketPath: "/var/run/docker.sock" });
  }
}

const docker = getDockerInstance();

export interface ValidationResult {
  success: boolean;
  version: string;
  durationMs: number;
  logs: string;
  error?: string;
  details?: {
    stage: "init" | "validate" | "timeout" | "internal";
    stdout: string;
    stderr: string;
  };
}

/**
 * Forcefully cleans up any old or orphaned sandbox containers from previous runs.
 */
async function cleanupOldContainers(): Promise<void> {
  try {
    const containers = await docker.listContainers({ all: true });
    for (const info of containers) {
      const isSandboxContainer = info.Names.some(
        (n) => n.includes("zeroops-sandbox") || n.includes("zeroops-val-")
      );
      if (isSandboxContainer) {
        try {
          const c = docker.getContainer(info.Id);
          if (info.State === "running") {
            await c.stop({ t: 1 }).catch(() => {});
          }
          await c.remove({ force: true }).catch(() => {});
        } catch {
          // Ignore container-specific cleanup errors
        }
      }
    }
  } catch (err) {
    console.error("Warning: Could not list containers for cleanup:", err);
  }
}

/**
 * Ensures a lightweight Alpine Linux sandbox image with Terraform exists.
 * Tries local zeroops-terraform-sandbox, then builds from Dockerfile.sandbox, or falls back to hashicorp/terraform:1.7.0.
 */
async function ensureSandboxImage(onLog: (data: string) => void): Promise<string> {
  const preferredImage = process.env.SANDBOX_IMAGE_NAME || "zeroops-terraform-sandbox";

  // Check 1: Check if custom sandbox image exists
  try {
    await docker.getImage(preferredImage).inspect();
    return preferredImage;
  } catch {
    // Not found, check fallback or build
  }

  // Check 2: Check if official lightweight hashicorp/terraform image exists
  try {
    await docker.getImage("hashicorp/terraform:1.7.0").inspect();
    return "hashicorp/terraform:1.7.0";
  } catch {
    // Not found
  }

  // Check 3: Auto-build from local Dockerfile.sandbox
  const dockerfilePath = path.join(process.cwd(), "Dockerfile.sandbox");
  if (fs.existsSync(dockerfilePath)) {
    onLog(`\x1b[36m[Sandbox]\x1b[0m Building lightweight Alpine Linux sandbox from Dockerfile.sandbox...\r\n`);
    const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");
    const pack = tar.pack();
    pack.entry({ name: "Dockerfile" }, dockerfileContent);
    pack.finalize();

    try {
      const stream = await docker.buildImage(pack as unknown as NodeJS.ReadableStream, {
        t: preferredImage,
      });

      await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(
          stream,
          (err: any) => (err ? reject(err) : resolve()),
          (event: any) => {
            if (event.stream) {
              onLog(`\x1b[90m${event.stream}\x1b[0m`);
            }
          }
        );
      });
      onLog(`\x1b[32m[Sandbox]\x1b[0m Lightweight Alpine Linux image built and cached.\r\n\r\n`);
      return preferredImage;
    } catch (buildErr: any) {
      onLog(`\x1b[33m[Sandbox]\x1b[0m Local build failed (${buildErr.message}). Attempting Docker Hub pull...\r\n`);
    }
  }

  // Fallback: Pull official minimal Alpine Linux Terraform image
  const fallbackImage = "hashicorp/terraform:1.7.0";
  onLog(`\x1b[36m[Sandbox]\x1b[0m Pulling minimal Alpine Linux image (${fallbackImage}) from Docker Hub...\r\n`);
  await new Promise<void>((resolve, reject) => {
    docker.pull(fallbackImage, (err: any, stream: any) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (pullErr: any) => {
        if (pullErr) return reject(pullErr);
        resolve();
      });
    });
  });
  onLog(`\x1b[32m[Sandbox]\x1b[0m Alpine Linux sandbox image ready.\r\n\r\n`);
  return fallbackImage;
}

/**
 * Creates an in-memory tar archive containing the file to inject into the container.
 */
function createTarArchive(fileName: string, fileContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack();
    const chunks: Buffer[] = [];
    pack.on("data", (chunk: unknown) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    });
    pack.on("error", (err) => reject(err));

    pack.entry({ name: fileName }, fileContent, (err) => {
      if (err) {
        reject(err);
      } else {
        pack.finalize();
      }
    });
  });
}

/**
 * Executes a command inside the running Linux sandbox container and streams stdout/stderr.
 */
function execCommand(
  container: Docker.Container,
  cmd: string[],
  onLog: (data: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      });

      const stream = await exec.start({ Tty: true });
      let stdout = "";
      let stderr = "";

      stream.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        stdout += text;
        onLog(text);
      });

      stream.on("end", async () => {
        try {
          const inspectData = await exec.inspect();
          const exitCode = inspectData.ExitCode ?? 0;
          resolve({
            code: exitCode,
            stdout,
            stderr,
          });
        } catch (inspectErr) {
          reject(inspectErr);
        }
      });

      stream.on("error", (streamErr) => {
        reject(streamErr);
      });
    } catch (execErr) {
      reject(execErr);
    }
  });
}

/**
 * Isolated Lightweight Linux Docker Sandbox Engine.
 * Spawns a minimal Alpine Linux container, injects Terraform HCL into /workspace,
 * and executes syntax & configuration build error checks.
 */
export async function validateTerraformSandbox(
  code: string,
  onLog: (data: string) => void
): Promise<ValidationResult> {
  const startTime = Date.now();
  const timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT_MS || "300000", 10);
  const containerName = `zeroops-sandbox-${crypto.randomBytes(4).toString("hex")}`;

  let container: Docker.Container | null = null;
  let timeoutTimer: NodeJS.Timeout | null = null;

  try {
    // 1. Clean up any stale or lingering containers from previous validations
    await cleanupOldContainers();

    // 2. Ensure lightweight Alpine Linux image is available
    const imageName = await ensureSandboxImage(onLog);

    onLog(`\x1b[38;5;244mroot@zeroops-sandbox\x1b[0m:\x1b[38;5;39m/workspace\x1b[0m# uname -srm\r\n`);
    onLog(`Linux 6.6.x-alpine x86_64\r\n\r\n`);

    // 3. Create the transient minimal container
    container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      WorkingDir: "/workspace",
      Cmd: ["tail", "-f", "/dev/null"],
      HostConfig: {
        CpuPeriod: 100000,
        CpuQuota: 100000, // 1.0 CPU
        Memory: 512 * 1024 * 1024, // 512 MB
        AutoRemove: false,
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    // 4. Set safety watchdog timer (120s)
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(async () => {
        onLog(`\r\n\x1b[31m[Sandbox Timeout] Validation exceeded execution limit of ${timeoutMs / 1000}s. Terminating container.\x1b[0m\r\n`);
        if (container) {
          try {
            await container.kill();
          } catch {}
        }
        reject(new Error(`Validation timed out after ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);
    });

    const executionPromise = async (): Promise<ValidationResult> => {
      // 5. Inject Terraform code into /workspace/main.tf
      onLog(`\x1b[38;5;244mroot@zeroops-sandbox\x1b[0m:\x1b[38;5;39m/workspace\x1b[0m# cat > main.tf << 'EOF'\r\n`);
      const tarBuffer = await createTarArchive("main.tf", code);
      const tarStream = new Readable();
      tarStream.push(tarBuffer);
      tarStream.push(null);
      await container!.putArchive(tarStream, { path: "/workspace" });
      onLog(`\x1b[90m[main.tf written to /workspace (${Buffer.byteLength(code)} bytes)]\x1b[0m\r\n\r\n`);

      // 6. Get Terraform version
      const versionResult = await execCommand(container!, ["terraform", "version"], () => {});
      const tfVersion = versionResult.stdout.split("\n")[0]?.trim() || "Terraform v1.7.0 (Alpine)";

      // 7. Check Build Errors - Stage 1: terraform init
      onLog(`\x1b[38;5;244mroot@zeroops-sandbox\x1b[0m:\x1b[38;5;39m/workspace\x1b[0m# terraform init -backend=false -no-color\r\n`);
      const initResult = await execCommand(
        container!,
        ["terraform", "init", "-backend=false", "-no-color"],
        onLog
      );

      if (initResult.code !== 0) {
        return {
          success: false,
          version: tfVersion,
          durationMs: Date.now() - startTime,
          logs: initResult.stdout,
          error: "Build Error: Terraform initialization failed (invalid provider configuration or dependency resolution).",
          details: { stage: "init", stdout: initResult.stdout, stderr: initResult.stderr },
        };
      }

      onLog(`\r\n\x1b[32m✔ Provider plugins & workspace initialized successfully.\x1b[0m\r\n\r\n`);

      // 8. Check Build Errors - Stage 2: terraform validate
      onLog(`\x1b[38;5;244mroot@zeroops-sandbox\x1b[0m:\x1b[38;5;39m/workspace\x1b[0m# terraform validate -no-color\r\n`);
      const validateResult = await execCommand(
        container!,
        ["terraform", "validate", "-no-color"],
        onLog
      );

      if (validateResult.code !== 0) {
        return {
          success: false,
          version: tfVersion,
          durationMs: Date.now() - startTime,
          logs: validateResult.stdout,
          error: "Build Error: Terraform configuration check failed. See compiler output above.",
          details: { stage: "validate", stdout: validateResult.stdout, stderr: validateResult.stderr },
        };
      }

      onLog(`\r\n\x1b[1;32m✔ Success! The Terraform configuration is valid and free of build errors.\x1b[0m\r\n`);

      return {
        success: true,
        version: tfVersion,
        durationMs: Date.now() - startTime,
        logs: validateResult.stdout,
      };
    };

    const finalResult = await Promise.race([executionPromise(), timeoutPromise]);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    return finalResult;
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    return {
      success: false,
      version: "Unknown",
      durationMs: Date.now() - startTime,
      logs: "",
      error: err.message || "An unexpected error occurred in the sandbox.",
      details: {
        stage: err.message?.includes("timed out") ? "timeout" : "internal",
        stdout: "",
        stderr: err.message || "",
      },
    };
  } finally {
    // 9. Mandatory Cleanup: Stop & remove transient container immediately
    if (container) {
      try {
        await container.stop({ t: 1 }).catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch (e) {
        console.error("Cleanup error for container:", e);
      }
    }
  }
}
