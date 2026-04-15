// Amazon SNS SMS utility — drop-in replacement for Twilio SMS sending
// Uses AWS SigV4 signing (same pattern as bedrock-utils.ts)

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

// Format phone number to E.164 format (South African focus)
export function formatPhoneE164(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendSmsSNS(to: string, body: string): Promise<SmsResult> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_REGION") || "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    console.error("Missing AWS credentials for SNS SMS");
    return { success: false, error: "AWS credentials not configured" };
  }

  const formattedTo = formatPhoneE164(to);
  const service = "sns";
  const host = `sns.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const method = "POST";

  // Build SNS Publish request body
  const params = new URLSearchParams({
    Action: "Publish",
    PhoneNumber: formattedTo,
    Message: body,
    "MessageAttributes.entry.1.Name": "AWS.SNS.SMS.SenderID",
    "MessageAttributes.entry.1.Value.DataType": "String",
    "MessageAttributes.entry.1.Value.StringValue": "edLEAD",
    "MessageAttributes.entry.2.Name": "AWS.SNS.SMS.SMSType",
    "MessageAttributes.entry.2.Value.DataType": "String",
    "MessageAttributes.entry.2.Value.StringValue": "Transactional",
    Version: "2010-03-31",
  });

  const bodyStr = params.toString();

  // AWS SigV4 signing
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const contentType = "application/x-www-form-urlencoded; charset=utf-8";
  const payloadHash = await sha256(bodyStr);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    method, "/", "",
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

  console.log(`Sending SNS SMS to ${formattedTo} via ${region}`);

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": contentType,
        "X-Amz-Date": amzDate,
        "Authorization": authHeader,
      },
      body: bodyStr,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`SNS error ${response.status}:`, responseText);
      return { success: false, error: `SNS API error: ${response.status}` };
    }

    // Extract MessageId from XML response
    const messageIdMatch = responseText.match(/<MessageId>(.*?)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

    console.log("SNS SMS sent successfully:", messageId);
    return { success: true, sid: messageId };
  } catch (error: any) {
    console.error("Error sending SNS SMS:", error);
    return { success: false, error: error.message };
  }
}
