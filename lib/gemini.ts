"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
}

export async function debugTerraform(code: string): Promise<string> {
    if (!model) {
        return "Error: GEMINI_API_KEY is not set in the environment variables.";
    }

    const prompt = `You are an expert DevOps engineer and a Google Cloud Platform (GCP) Terraform specialist. 
  Please analyze the following Terraform code for errors, best practices (specifically for GCP), and security vulnerabilities. 
  Focus on the 'google cloude' and 'gcp' providers.
  
  CRITICAL GUIDELINES:
  1. Ignore any placeholder values (e.g., "YOUR_BACKEND_SERVICE", "enter your project id", "your-region"). Do NOT treat them as errors or invalid references.
  2. When generating the corrected code, DO NOT include any comments whatsoever.
  3. Ensure the corrected code is perfectly formatted with proper indentation (2 spaces) and strict, consistent line spacing/scheme.
  
  Format your response in structured Markdown.
  Use the following sections, and ensure each section starts with an H2 (##) header:
  
  ## Analysis
  [General analysis of the code]
  
  ## Security Risks
  [List any security vulnerabilities found]
  
  ## Best Practices
  [Suggestions for GCP best practices]
  
  ## Corrected Code
  [Provide the corrected Terraform code in a hcl code block]
  
  Terraform Code:
  \`\`\`hcl
  ${code}
  \`\`\`
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        return `Error debugging Terraform code: ${error.message}`;
    }
}

export async function getArchitecturalSuggestions(description: string): Promise<string> {
    if (!model) {
        return "Error: GEMINI_API_KEY is not set in the environment variables.";
    }

    const prompt = `You are an expert Google Cloud Architect. 
    The user needs help designing a cloud architecture on GCP.
    Based on the following description, suggest the best architectural patterns using Google Cloud services (e.g., Cloud Run, GKE, BigQuery, Pub/Sub, Cloud Functions, Spanner, etc.).
    Focus on modern, scalable, serverless, and secure practices on Google Cloud.

    FORMATTING REQUIREMENTS:
    1. Structure your response with clear headings (##).
    2. Use bullet points for key components.
    3. CRITICAL: Include a clear text-based diagram (ASCII Art) to visualize the architecture.
       - Use box-and-arrow style text diagrams.
       - Ensure it is enclosed in a code block.
       - Keep it simple, readable, and well-spaced.
       - Example:
       \`\`\`
    [User] -> [Load Balancer] -> [Cloud Run]
        |
        v
        [Cloud SQL]
    \`\`\`
    
    User Description:
    "${description}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        return `Error getting architectural suggestions: ${error.message}`;
    }
}

export async function validateTerraform(code: string): Promise<string> {
    if (!model) {
        return "Error: GEMINI_API_KEY is not set.";
    }

    const prompt = `You are a Terraform validation expert.
    Analyze the following Terraform code for correctness, syntax errors, and logical flaws.
    Return a short summary of the validation status.
    If it is correct, start with "✅ VALID".
    If there are errors, start with "❌ INVALID" and list them.
    
    CRITICAL: 
    - Do NOT consider missing values, or ANY placeholder strings (e.g. "YOUR_BACKEND_SERVICE", "your-project-id", etc.) as errors. Ignore them entirely.
    - ONLY check if the rest of the code is structurally valid.
    
    COST CHECK:
    - You must also quickly analyze if the resources could be cheaper (e.g., using a high-tier instance instead of e2-micro, not using spot instances where applicable).
    - If you strongly believe the code is NOT cost-optimized, include the exact string "COST_OPTIMIZATION_REQUIRED" anywhere in your response.
    
    Code:
    \`\`\`hcl
    ${code}
    \`\`\`
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        return `Validation failed: ${error.message}`;
    }
}

export async function optimizeTerraform(code: string, strategies: string[] = []): Promise<{ optimizedCode: string; tips: string }> {
    if (!model) {
        return { optimizedCode: code, tips: "Error: API Key missing." };
    }

    const strategiesPrompt = strategies.length > 0 
        ? `\n    USER-SELECTED CRITICAL OPTIMIZATION STRATEGIES:\n    You MUST apply the following optimization strategies strictly in the generated code:\n    ${strategies.map(s => `- ${s}`).join("\n")}\n`
        : "";

    const prompt = `You are a Cloud Infrastructure Optimization expert and Terraform specialist.
    Analyze the following Terraform code and provide an OPTIMIZED, DEBUGGED version.
    
    GUIDELINES:
    1. Focus on standard code/infrastructure optimization. Do NOT make suggestions specific to any single cloud provider like GCP unless explicitly requested by the selected user strategies.
    2. Dynamic Variables & Placeholders: The use of placeholders (like "YOUR_BACKEND_SERVICE", "your-project-id") is a DESIGN CHOICE. Do NOT treat them as errors.
    3. CRITICAL: DO NOT replace placeholders with actual values. Leave placeholders exactly as they are. Rather, work ONLY on the rest of the code to make it cost friendly.
    4. Code Formatting: The output optimized code MUST contain NO COMMENTS. It must be perfectly formatted using strict indentation (2 spaces) and proper line spacing.
    5. CRITICAL: DO NOT use markdown code blocks (e.g. \`\`\`hcl) inside the optimizedCode string. The optimizedCode MUST be pure, raw plain text.
    ${strategiesPrompt}
    
    OUTPUT FORMAT:
    You MUST return a valid JSON object. Do not include any markdown formatting like \`\`\`json blocks in the actual response text, just the raw JSON.
    
    JSON Structure:
    {
      "optimizedCode": "The full, optimized Terraform HCL code as a single escaped string",
      "tips": "A markdown list of changes and cost-saving tips"
    }
    
    CRITICAL: Ensure all double quotes and newlines within the "optimizedCode" value are properly escaped so the JSON remains valid.
    
    CODE TO OPTIMIZE:
    ${code}
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Robust JSON extraction: look for the first '{' and the last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("Could not find a valid JSON object in the AI response.");
        }

        const jsonString = text.substring(firstBrace, lastBrace + 1);

        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.optimizedCode) {
                // Strip any accidental markdown formatting the AI might have included
                parsed.optimizedCode = parsed.optimizedCode.replace(/^```[a-z]*\n/im, "").replace(/\n```$/im, "").trim();
            }
            return parsed;
        } catch (parseError) {
            console.error("Initial JSON parse failed, attempting cleanup:", jsonString);
            // Fallback: simple cleanup of common AI formatting mistakes
            const cleaned = jsonString
                .replace(/\\n/g, "\\n")
                .replace(/\\"/g, "\\\"")
                .replace(/[\u0000-\u001F]+/g, ""); // Remove control characters
            return JSON.parse(cleaned);
        }
    } catch (error: any) {
        console.error("Optimization error:", error);
        return {
            optimizedCode: code,
            tips: `Failed to optimize code due to a formatting error in the AI response. Error: ${error.message}`
        };
    }
}

export async function terraformToArchitecture(code: string): Promise<any> {
    if (!model) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    const prompt = `You are a cloud architecture reverse-engineering expert.
    I will provide you with Terraform HCL code. Your job is to analyze this code, identify the Google Cloud resources, and map them to my application's visual UI components.
    
    You must output a strictly valid JSON object representing the visual canvas. It must contain two arrays: "components" and "connections".
    
    VALID COMPONENT TYPES & METADATA (You must ONLY use these 'type' values, and use the exact matching 'category' and 'icon'):
    - "compute-engine" (category: "compute", icon: "Server")
    - "cloud-functions" (category: "compute", icon: "Zap")
    - "cloud-run" (category: "compute", icon: "Container")
    - "gke" (category: "compute", icon: "Boxes")
    - "app-engine" (category: "compute", icon: "Layers")
    - "vpc-network" (category: "networking", icon: "Network")
    - "load-balancer" (category: "networking", icon: "Split")
    - "cloud-cdn" (category: "networking", icon: "Wifi")
    - "cloud-dns" (category: "networking", icon: "Globe")
    - "api-gateway" (category: "networking", icon: "GitBranch")
    - "cloud-storage" (category: "storage", icon: "Database")
    - "cloud-sql" (category: "storage", icon: "HardDrive")
    - "firestore" (category: "storage", icon: "Table")
    - "memorystore" (category: "storage", icon: "Gauge")
    - "bigtable" (category: "storage", icon: "LayoutGrid")
    - "firewall" (category: "security", icon: "Shield")
    - "iam" (category: "security", icon: "Key")
    - "cloud-armor" (category: "security", icon: "ShieldCheck")
    - "secret-manager" (category: "security", icon: "Lock")
    - "cloud-monitoring" (category: "monitoring", icon: "Activity")
    - "cloud-logging" (category: "monitoring", icon: "FileText")
    - "pub-sub" (category: "monitoring", icon: "Bell")
    - "cloud-trace" (category: "monitoring", icon: "Radar")
    - "artifact-registry" (category: "storage", icon: "Package")
    
    If you see a Terraform resource that doesn't fit perfectly, map it to the closest logical type.
    
    JSON SCHEMA REQUIREMENT:
    {
      "components": [
        {
          "id": "unique-string-id-for-node",
          "type": "one-of-the-valid-types-above",
          "category": "matching-category",
          "name": "Human Readable Name (e.g. from the TF resource name)",
          "position": { "x": 100, "y": 100 },
          "size": { "width": 64, "height": 64 },
          "config": {},
          "icon": "matching-icon",
          "cost": 0
        }
      ],
      "connections": [
        {
          "id": "unique-connection-id",
          "from": "source-component-id",
          "to": "target-component-id",
          "fromAnchor": "bottom",
          "toAnchor": "top"
        }
      ]
    }
    
    CRITICAL INSTRUCTIONS:
    1. Output ONLY RAW JSON. No markdown backticks (e.g., \`\`\`json). Just the raw '{ "components": ... }' string.
    2. Try to intelligently assign 'x' and 'y' positions to arrange them nicely in a grid or flow (e.g., Networking on top, Compute in middle, Storage on bottom).
       - Typical canvas coordinates: x: 100 to 800, y: 100 to 600. Space them out by at least 150px.
    3. Infer "connections" based on Terraform references (e.g., if a Cloud Run connects to Cloud SQL via env vars or networks). If unclear, make logical connections.

    TERRAFORM CODE:
    ${code}
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Robust JSON extraction: look for the first '{' and the last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("Could not find a valid JSON object in the AI response.");
        }

        const jsonString = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonString);
    } catch (error: any) {
        console.error("Terraform to Architecture error:", error);
        throw new Error(`Failed to parse architecture: ${error.message}`);
    }
}

export async function migrateTerraform(code: string, fromCloud: string, toCloud: string): Promise<string> {
    if (!model) {
        return "Error: GEMINI_API_KEY is not set in the environment variables.";
    }

    const prompt = `You are an expert DevOps engineer and multi-cloud Terraform specialist.
  The user wants to migrate a Terraform configuration from ${fromCloud} to ${toCloud}.
  Please parse the input Terraform code, translate all resources, variables, provider blocks, and parameters to their equivalents in ${toCloud}, and output a complete, valid Terraform file.

  CRITICAL GUIDELINES:
  1. The output MUST contain the EXACT migrated Terraform code file.
  2. Maintain equivalent settings, tags, sizing, regions/locations, and configurations.
  3. Format your response in structured Markdown.
  4. Ensure you include a dedicated section starting with the H2 (##) header "## Migrated Code" containing the generated code inside a single hcl code block.
  5. Include an explanation section starting with the H2 (##) header "## Migration Notes" describing what changes were made (e.g. what resources mapped to what).

  Source Cloud: ${fromCloud}
  Target Cloud: ${toCloud}

  Original Terraform Code:
  \`\`\`hcl
  ${code}
  \`\`\`
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        return `Error migrating Terraform code: ${error.message}`;
    }
}

export async function chatAboutArchitecture(
    message: string,
    components: any[],
    connections: any[],
    history: { role: "user" | "model", parts: { text: string }[] }[]
): Promise<string> {
    if (!model) {
        return "Error: GEMINI_API_KEY is not set in the environment variables.";
    }

    const compList = components.map(c => {
        return `- Component Name: "${c.name}", Type: "${c.type}", Category: "${c.category}", Cost: $${c.cost}/mo, Configuration: ${JSON.stringify(c.config || {})}`;
    }).join("\n");

    const connList = connections.map(conn => {
        const fromComp = components.find(c => c.id === conn.from);
        const toComp = components.find(c => c.id === conn.to);
        const fromName = fromComp ? fromComp.name : conn.from;
        const toName = toComp ? toComp.name : conn.to;
        return `- Connection from "${fromName}" (${conn.fromAnchor}) to "${toName}" (${conn.toAnchor})`;
    }).join("\n");

    const prompt = `You are an expert Google Cloud (GCP) Architect and DevOps bot.
    The user is visualising and constructing a cloud architecture diagram in their browser.
    
    Here is the current state of their architecture diagram:
    
    ### COMPONENTS:
    ${compList || "No components currently on the canvas."}
    
    ### CONNECTIONS:
    ${connList || "No connections currently on the canvas."}
    
    ### USER'S INQUIRY:
    "${message}"
    
    CRITICAL INSTRUCTIONS:
    1. Keep responses extremely short, concise, and summarized. Focus on bullet points and immediate action items. Do NOT write long paragraphs.
    2. Limit your answer to 3-4 bullet points or a couple of short sentences.
    3. Answer the user's question directly based on their diagram components and connections.
    4. Suggest quick improvements regarding security (e.g. firewalls, public ports), cost (e.g. machine sizing), and reliability (e.g. load balancers).
    5. Avoid generic GCP introductions or standard boilerplate. Be direct.
    `;

    try {
        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage([
            { text: prompt }
        ]);

        const response = await result.response;
        return response.text();
    } catch (error: any) {
        return `Error chatting about architecture: ${error.message}`;
    }
}

export async function generateArchitectureFromPrompt(
    prompt: string,
    history: { role: "user" | "model"; parts: string }[] = [],
    currentComponents: any[] = [],
    currentConnections: any[] = []
): Promise<{ components: any[]; connections: any[]; message: string }> {
    if (!model) {
        throw new Error("API Key missing.");
    }

    const systemPrompt = `You are an expert AI Cloud Architect assistant.
Your task is to design or modify a visual cloud architecture diagram based on the user's request.

Available components on the canvas:
- compute-engine (Google Compute Engine Instance)
- cloud-run (Google Cloud Run Service)
- gke (Google Kubernetes Engine Cluster)
- cloud-functions (Google Cloud Functions)
- app-engine (Google App Engine)
- cloud-sql (Google Cloud SQL Database)
- cloud-storage (Google Cloud Storage Bucket)
- load-balancer (Google Cloud Load Balancer)
- cloud-cdn (Google Cloud CDN)
- cloud-dns (Google Cloud DNS Routing)
- api-gateway (Google Cloud API Gateway)
- vpc-network (Virtual Private Cloud Network)
- firestore (Google Cloud Firestore NoSQL Database)
- memorystore (Google Cloud Memorystore Redis/Memcached Cache)

The structure of a component is:
{
  "id": "string", // Unique ID. For new components, use format: "type-uniqueNumber" (e.g., "cloud-run-1").
  "type": "string", // Must be one of the available components listed above.
  "category": "string", // one of: 'compute' | 'database' | 'storage' | 'networking' | 'messaging' | 'security' | 'management'
  "name": "string", // Human-readable friendly name of this instance (e.g. "Frontend Service")
  "position": { "x": number, "y": number }, // Coordinates. Keep X between 50 and 800, Y between 50 and 600. Space out components by at least 250px so they don't overlap!
  "size": { "width": 128, "height": 128 },
  "config": {}, // Specifications / Parameters. You MUST strictly use the keys and values below!
  "icon": "string", // Must match the designated icon string from the specification below!
  "cost": number // Estimated monthly cost in USD.
}

CRITICAL: SPECIFICATION CASE KEYS, VALUES & ICONS (Strict config properties for each component):
- For "compute-engine":
  * "icon" MUST be "Server"
  * "config.machineType" (e.g. "e2-micro", "e2-small", "e2-medium", "e2-standard-2", "e2-standard-4", "e2-standard-8", "n2-standard-2")
  * "config.region" (e.g. "us-central1", "us-east1", "europe-west1", "asia-east1")
  * "config.diskSize" (e.g. "10", "20", "50", "100", "200", "500")
  * "config.diskType" ("pd-standard", "pd-balanced", "pd-ssd")
  * "config.autoscale" ("disabled", "cpu-70", "cpu-80")
  * "config.minInstances" ("0", "1", "2", "3", "5")
  * "config.maxInstances" ("1", "3", "5", "10", "20", "50", "100")
- For "cloud-functions":
  * "icon" MUST be "Zap"
  * "config.runtime" ("nodejs20", "nodejs18", "python312", "go121")
  * "config.memory" ("128MB", "256MB", "512MB", "1024MB", "2048MB", "4096MB", "8192MB")
  * "config.region" (standard regions)
  * "config.timeout" ("30", "60", "120", "300", "540")
  * "config.minInstances" / "config.maxInstances" (same options as compute-engine)
- For "cloud-run":
  * "icon" MUST be "Container"
  * "config.memory" (same function memory options)
  * "config.cpu" ("1", "2", "4", "8")
  * "config.region" (standard regions)
  * "config.autoscale" ("disabled", "cpu-70", "requests")
  * "config.minInstances" / "config.maxInstances"
- For "gke":
  * "icon" MUST be "Boxes"
  * "config.machineType" (same machineTypes as compute-engine)
  * "config.region"
  * "config.nodeCount" ("1", "2", "3", "5")
  * "config.autoscale" / "config.minNodes" / "config.maxNodes"
- For "cloud-sql":
  * "icon" MUST be "HardDrive"
  * "config.databaseType" ("postgresql", "mysql", "sqlserver")
  * "config.instanceType" ("db-f1-micro", "db-g1-small", "db-n1-standard-1", "db-n1-standard-2", "db-n1-standard-4")
  * "config.region"
  * "config.storageSize" (GB capacity number as string, e.g. "10", "50", "100", "250", "500", "1000")
  * "config.highAvailability" ("disabled", "enabled")
- For "cloud-storage":
  * "icon" MUST be "Database"
  * "config.storageClass" ("STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE")
  * "config.region"
  * "config.versioning" ("disabled", "enabled")
- For "load-balancer":
  * "icon" MUST be "Split"
  * "config.type" ("http", "tcp", "ssl", "network", "internal")
  * "config.region" ("global" or custom region)
  * "config.sslEnabled" ("true", "false")

The structure of a connection is:
{
  "id": "string", // Unique connection ID (e.g. "conn-1")
  "from": "string", // Source component 'id'
  "to": "string" // Destination component 'id'
}

If this is a MODIFICATION request:
You are provided with the current state of the architecture:
Current Components: ${JSON.stringify(currentComponents)}
Current Connections: ${JSON.stringify(currentConnections)}

CRITICAL GUIDELINES:
1. When modifying existing components, you MUST retain all their existing settings, IDs, names, positions, and unchanged config variables unless the user explicitly requested to modify or delete them. Do NOT reset unchanged component configuration fields to empty/null values.
2. Translate user prompt requests for specification updates (e.g. "upgrade SQL storage to 100GB", "make Cloud Run memory 2GB") into the correct config key and value mapping from the rules list above.
3. Keep component positions spaced by at least 250px so they do not overlap.

OUTPUT FORMAT:
Return a single JSON object. DO NOT wrap it in any markdown code blocks like \`\`\`json. The output MUST be valid, parseable JSON text.
JSON Structure:
{
  "components": [ ... ],
  "connections": [ ... ],
  "message": "A concise text explaining what has been generated/modified, key design choices, and security considerations."
}
`;

    // Construct history messages for Gemini chat
    const geminiHistory = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am ready to act as the AI Cloud Architect. Please describe the architecture or changes you want to make." }] }
    ];

    for (const msg of history) {
        geminiHistory.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.parts }]
        });
    }

    // Append the current message
    const currentMsg = `User request: ${prompt}
Current components: ${JSON.stringify(currentComponents)}
Current connections: ${JSON.stringify(currentConnections)}`;
    
    geminiHistory.push({
        role: "user",
        parts: [{ text: currentMsg }]
    });

    try {
        const chat = model.startChat({
            history: geminiHistory.slice(0, -1)
        });
        
        const result = await chat.sendMessage(currentMsg);
        let text = result.response.text();
        
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("Invalid response format. Missing JSON brackets.");
        }
        
        const jsonString = text.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonString);
        
        if (!Array.isArray(parsed.components) || !Array.isArray(parsed.connections)) {
            throw new Error("Invalid output structure: components and connections must be arrays.");
        }
        
        return {
            components: parsed.components,
            connections: parsed.connections,
            message: parsed.message || "Architecture updated."
        };
    } catch (error: any) {
        console.error("Failed to generate architecture:", error);
        throw error;
    }
}

