// Shared AWS Bedrock utility for Deno edge functions
// Implements AWS Signature V4 signing using Web Crypto APIs

const DEFAULT_MODEL = "anthropic.claude-3-5-sonnet-20240620-v1:0";

async function hmacSHA256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const keyData = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function sha256(message: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(
  secretKey: string, dateStamp: string, region: string, service: string
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const kSecret = enc.encode("AWS4" + secretKey);
  const kDate = await hmacSHA256(kSecret, dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  return hmacSHA256(kService, "aws4_request");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface BedrockRequest {
  messages: Array<{ role: string; content: any }>;
  system?: string;
  tools?: any[];
  tool_choice?: any;
  model?: string;
  max_tokens?: number;
}

interface BedrockResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: any }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function callBedrock(req: BedrockRequest): Promise<BedrockResponse> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_REGION") || "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  console.log(`AWS config: region=${region}, keyId=${accessKeyId.slice(0, 4)}...${accessKeyId.slice(-4)}, keyLen=${secretAccessKey.length}`);

  const modelId = req.model || DEFAULT_MODEL;
  const service = "bedrock";
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  // Model ID goes directly in URL path (no encoding needed for Bedrock)
  const canonicalUri = `/model/${modelId}/invoke`;
  const endpoint = `https://${host}${canonicalUri}`;
  const method = "POST";

  // Build Bedrock/Anthropic request body
  const body: any = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: req.max_tokens || 4096,
    messages: req.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  };

  if (req.system) {
    body.system = req.system;
  }
  if (req.tools && req.tools.length > 0) {
    body.tools = req.tools;
  }
  if (req.tool_choice) {
    body.tool_choice = req.tool_choice;
  }

  const bodyStr = JSON.stringify(body);

  // AWS SigV4 signing
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const amzDate = dateStr; // Format: 20260214T155300Z
  const dateStamp = amzDate.slice(0, 8);

  const canonicalQuerystring = "";
  const payloadHash = await sha256(bodyStr);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    method, canonicalUri, canonicalQuerystring,
    canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSHA256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`Calling Bedrock model: ${modelId}`);

  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": amzDate,
      "Authorization": authHeader,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Bedrock error ${response.status}:`, errorText);
    throw new Error(`Bedrock API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
