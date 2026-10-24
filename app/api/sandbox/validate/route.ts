import { NextRequest, NextResponse } from "next/server";
import { validateTerraformSandbox } from "@/lib/sandbox";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Missing Terraform HCL code content." }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: "log" | "result" | "error", data: any) => {
          const payload = JSON.stringify({ type, data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        try {
          const result = await validateTerraformSandbox(code, (logLine) => {
            sendEvent("log", logLine);
          });
          sendEvent("result", result);
        } catch (err: any) {
          sendEvent("error", err.message || "Execution exception inside sandbox.");
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error: any) {
    console.error("Sandbox API Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process sandbox validation request." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
