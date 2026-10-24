import Docker from "dockerode";
import tar from "tar-stream";
import { Readable } from "stream";
import crypto from "crypto";

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
    stage: "format" | "init" | "validate" | "timeout" | "internal";
    stdout: string;
    stderr: string;
  };
}

/**
 * Creates a tar archive in memory containing a single main.tf file.
 */
function createTarArchive(fileName: string, fileContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack();
    const chunks: Buffer[] = [];
    
    pack.on("data", (chunk) => chunks.push(chunk));
    pack.on("end", () => resolve(Buffer.concat(chunks)));
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
 * Executes a command inside a running Docker container and streams outputs in real-time.
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
        Tty: true // Preserves ANSI colors and formats cleanly
      });

      const stream = await exec.start({});
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
            stderr
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
 * Isolated Sandbox Engine for validating Terraform configuration using transient Docker containers.
 */
export async function validateTerraformSandbox(
  code: string,
  onLog: (data: string) => void
): Promise<ValidationResult> {
  const startTime = Date.now();
  const imageName = process.env.SANDBOX_IMAGE_NAME || "zeroops-terraform-sandbox";
  const timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT_MS || "60000", 10);
  const cpuLimit = parseFloat(process.env.SANDBOX_CPU_LIMIT || "1.0");
  const memoryLimitMb = parseInt(process.env.SANDBOX_MEMORY_LIMIT_MB || "512", 10);

  // Compute resource parameters
  // CPU quota is period * cores
  const cpuPeriod = 100000;
  const cpuQuota = Math.round(cpuPeriod * cpuLimit);
  const memoryLimitBytes = memoryLimitMb * 1024 * 1024;

  const containerName = `zeroops-val-${crypto.randomBytes(6).toString("hex")}`;
  let container: Docker.Container | null = null;
  let timeoutTimer: NodeJS.Timeout | null = null;

  try {
    onLog(`\n[Sandbox] Initializing isolated validation workspace container: ${containerName}\n`);
    
    // Create the container
    container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      HostConfig: {
        CpuPeriod: cpuPeriod,
        CpuQuota: cpuQuota,
        Memory: memoryLimitBytes,
        AutoRemove: false // We will handle explicit destruction to guarantee final logs retrieval
      },
      AttachStdout: true,
      AttachStderr: true
    });

    // Start the container
    await container.start();

    // Set a safety watchdog timer to kill the container if validation exceeds timeout limits
    let isTimedOut = false;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(async () => {
        isTimedOut = true;
        onLog(`\n\n🔴 [Sandbox Timeout] Validation exceeded execution limit of ${timeoutMs / 1000}s. Terminating sandbox.\n`);
        if (container) {
          try {
            await container.kill();
          } catch (killErr) {}
        }
        reject(new Error(`Timeout: Validation exceeded execution limit of ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);
    });

    const executionPromise = async (): Promise<ValidationResult> => {
      // 1. Transfer HCL file in-memory using dynamic tar streams
      onLog(`[Sandbox] Uploading main.tf configuration in-memory archive...\n`);
      const tarBuffer = await createTarArchive("main.tf", code);
      const tarStream = new Readable();
      tarStream.push(tarBuffer);
      tarStream.push(null);

      await container!.putArchive(tarStream, { path: "/workspace" });

      // Retrieve Terraform Version
      const versionResult = await execCommand(container!, ["terraform", "version"], () => {});
      const tfVersion = versionResult.stdout.split("\n")[0] || "Unknown version";

      // Stage 1: terraform fmt -check
      onLog(`\n[Stage 1/3] Checking code formatting style...\n`);
      const fmtResult = await execCommand(container!, ["terraform", "fmt", "-check", "main.tf"], onLog);
      if (fmtResult.code !== 0) {
        return {
          success: false,
          version: tfVersion,
          durationMs: Date.now() - startTime,
          logs: fmtResult.stdout,
          error: "Formatting Validation Failed. Run terraform fmt to correct syntax structure.",
          details: { stage: "format", stdout: fmtResult.stdout, stderr: fmtResult.stderr }
        };
      }
      onLog(`✅ Code formatting matches required standards.\n`);

      // Stage 2: terraform init
      onLog(`\n[Stage 2/3] Initializing providers and modules...\n`);
      const initResult = await execCommand(container!, ["terraform", "init", "-no-color"], onLog);
      if (initResult.code !== 0) {
        return {
          success: false,
          version: tfVersion,
          durationMs: Date.now() - startTime,
          logs: initResult.stdout,
          error: "Initialization Failed. Failed to download plugins or configure backend providers.",
          details: { stage: "init", stdout: initResult.stdout, stderr: initResult.stderr }
        };
      }
      onLog(`✅ Initialization successful.\n`);

      // Stage 3: terraform validate
      onLog(`\n[Stage 3/3] Performing dry-run sandbox logical validation...\n`);
      const validateResult = await execCommand(container!, ["terraform", "validate", "-no-color"], onLog);
      if (validateResult.code !== 0) {
        return {
          success: false,
          version: tfVersion,
          durationMs: Date.now() - startTime,
          logs: validateResult.stdout,
          error: "Syntax or Logical Validation Failed.",
          details: { stage: "validate", stdout: validateResult.stdout, stderr: validateResult.stderr }
        };
      }
      onLog(`✅ Infrastructure configuration validated successfully!\n`);

      return {
        success: true,
        version: tfVersion,
        durationMs: Date.now() - startTime,
        logs: validateResult.stdout
      };
    };

    // Run race between execution and safety watchdog timeout
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
      details: { stage: err.message?.includes("Timeout") ? "timeout" : "internal", stdout: "", stderr: err.message || "" }
    };
  } finally {
    // Crucial Cleanup: Always destroy the container
    if (container) {
      try {
        onLog(`\n[Sandbox] Tearing down and removing validation container...\n`);
        await container.stop();
      } catch (e) {}
      try {
        await container.remove({ force: true });
        onLog(`[Sandbox] Isolated container destroyed successfully.\n`);
      } catch (e) {
        console.error("Failed to remove sandbox container:", e);
      }
    }
  }
}
