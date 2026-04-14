// Shared Lovable AI Gateway utility — drop-in replacement for bedrock-utils.ts
// Translates Bedrock request/response shapes to OpenAI-compatible format

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

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
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Build OpenAI-compatible messages array
  const messages: Array<{ role: string; content: any }> = [];
  if (req.system) {
    messages.push({ role: "system", content: req.system });
  }
  for (const m of req.messages) {
    messages.push({ role: m.role, content: m.content });
  }

  const body: any = {
    model: DEFAULT_MODEL,
    messages,
    max_tokens: req.max_tokens || 4096,
  };

  // Translate Bedrock tool format to OpenAI tool format
  if (req.tools && req.tools.length > 0) {
    body.tools = req.tools.map((t: any) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }

  if (req.tool_choice) {
    if (req.tool_choice.type === "tool" && req.tool_choice.name) {
      body.tool_choice = { type: "function", function: { name: req.tool_choice.name } };
    } else {
      body.tool_choice = req.tool_choice;
    }
  }

  console.log(`Calling Lovable AI Gateway: model=${DEFAULT_MODEL}`);

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error("AI rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add funds to continue.");
    }
    console.error(`Lovable AI error ${response.status}:`, errorText);
    throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Translate OpenAI response back to Bedrock response shape
  const choice = data.choices?.[0];
  const contentBlocks: BedrockResponse["content"] = [];

  if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
    for (const tc of choice.message.tool_calls) {
      let input = tc.function.arguments;
      if (typeof input === "string") {
        try { input = JSON.parse(input); } catch { /* keep as string */ }
      }
      contentBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input,
      });
    }
  }

  if (choice?.message?.content) {
    contentBlocks.push({ type: "text", text: choice.message.content });
  }

  return {
    id: data.id || "msg_lovable",
    type: "message",
    role: "assistant",
    content: contentBlocks,
    stop_reason: choice?.finish_reason === "tool_calls" ? "tool_use" : (choice?.finish_reason || "end_turn"),
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
  };
}
