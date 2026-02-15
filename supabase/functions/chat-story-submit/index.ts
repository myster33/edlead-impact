import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callBedrock } from "../bedrock-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED_FIELDS = [
  "title", "summary", "content", "author_name", "author_school",
  "author_country", "author_province", "author_email", "category", "reference_number",
];

const OPTIONAL_FIELDS = ["video_url", "tags", "author_phone"];

function getMissingFields(collected: Record<string, any>): string[] {
  return REQUIRED_FIELDS.filter(f => !collected[f] || (typeof collected[f] === "string" && collected[f].trim() === ""));
}

function buildSystemPrompt(collected: Record<string, any>) {
  const missing = getMissingFields(collected);
  const collectedSummary = Object.entries(collected)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `You are edLEAD's friendly Story Submission Assistant, helping a visitor submit their Leader's Story through the chat. Your job is to collect all required story information conversationally.

=== YOUR APPROACH ===
- Ask 1-2 related questions at a time
- Be warm, encouraging, and enthusiastic about their story
- For long fields (summary, content), ask simpler sub-questions and then compose polished text
- The summary should be 2-3 sentences; the content should be 3-6 paragraphs
- Help them craft compelling narratives from their experiences
- Validate data as you go (e.g., email format)

=== CATEGORIES ===
Valid categories: Leadership, Community Service, Innovation, Academic Excellence, Sports & Arts, Personal Growth, Mentorship

=== QUESTION FLOW ===
Follow this order:
1. Title: Ask what they'd like to call their story
2. Category: Ask which category best fits (provide the list)
3. Reference number: Ask for their edLEAD application reference number (format like H9RK8B9N)
4. School info: author_school, author_country (default "South Africa"), author_province
5. Contact: author_email (may be pre-filled), author_phone (optional)
6. Summary: Ask 1-2 questions about the key takeaway of their story, then compose a 2-3 sentence summary
7. Content: Ask 3-4 questions about their experience (what happened, what they learned, how it changed them, advice for others). Then compose a well-written 3-6 paragraph story from their answers.
8. Optional: Ask if they have a video link (YouTube/Vimeo) they'd like to include

=== COMPOSING LONG TEXT ===
For summary: Ask "In one sentence, what is your story about?" and "What's the most important lesson?" Then compose a polished 2-3 sentence summary.
For content: Ask progressively:
- "Tell me about the experience — what happened?"
- "What did you learn from it?"
- "How has it changed you as a leader?"
- "What advice would you give others?"
Then compose a well-written story (3-6 paragraphs) from their answers in first person.

=== FEATURED IMAGE ===
Don't ask for the image directly. Near the end, mention: "You can also upload a featured image for your story using the upload button below."

=== CURRENTLY COLLECTED ===
${collectedSummary || "Nothing collected yet — this is the start of the submission."}

=== STILL NEEDED ===
${missing.length > 0 ? missing.join(", ") : "ALL FIELDS COLLECTED! Tell the visitor their story is ready and they can click the Submit button below."}

=== CRITICAL RULES ===
- ALWAYS use the respond_and_collect tool for EVERY response
- Only include fields in extracted_data that the visitor JUST provided in their latest message
- Don't re-extract data that's already been collected
- Keep replies concise and conversational
- If all fields are collected, set is_complete to true and congratulate them
- author_name should be pre-filled from chat intro — confirm it with them`;
}

const BEDROCK_TOOL = {
  name: "respond_and_collect",
  description: "Provide a conversational reply and extract any new story data from the visitor's message",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Your conversational reply to the visitor" },
      extracted_data: {
        type: "object",
        description: "New story fields extracted from the visitor's latest message. Only include fields that were just provided.",
        properties: {
          title: { type: "string" },
          summary: { type: "string", description: "2-3 sentence summary of the story" },
          content: { type: "string", description: "Full story content, 3-6 paragraphs" },
          author_name: { type: "string" },
          author_school: { type: "string" },
          author_country: { type: "string" },
          author_province: { type: "string" },
          author_email: { type: "string" },
          author_phone: { type: "string" },
          category: { type: "string", description: "One of: Leadership, Community Service, Innovation, Academic Excellence, Sports & Arts, Personal Growth, Mentorship" },
          reference_number: { type: "string", description: "edLEAD application reference number" },
          video_url: { type: "string" },
          tags: { type: "string", description: "Comma-separated tags" },
        },
      },
      is_complete: { type: "boolean", description: "True if all required fields have been collected" },
    },
    required: ["reply", "extracted_data", "is_complete"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, collected_data, visitor_name } = await req.json();

    const collected = collected_data || {};
    const systemPrompt = buildSystemPrompt(collected);

    const userMessages = (messages || [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({ role: m.role, content: m.content }));

    const bedrockResponse = await callBedrock({
      system: systemPrompt,
      messages: userMessages,
      tools: [BEDROCK_TOOL],
      tool_choice: { type: "tool", name: "respond_and_collect" },
      max_tokens: 4096,
    });

    let reply = "Let's continue with your story! What would you like to share next?";
    let extractedData: Record<string, any> = {};
    let isComplete = false;

    const toolUseBlock = bedrockResponse.content?.find((b: any) => b.type === "tool_use");

    if (toolUseBlock?.input) {
      reply = toolUseBlock.input.reply || reply;
      extractedData = toolUseBlock.input.extracted_data || {};
      isComplete = toolUseBlock.input.is_complete || false;

      Object.keys(extractedData).forEach(key => {
        if (extractedData[key] === null || extractedData[key] === undefined || extractedData[key] === "") {
          delete extractedData[key];
        }
      });
    } else {
      const textBlock = bedrockResponse.content?.find((b: any) => b.type === "text");
      reply = textBlock?.text || reply;
    }

    const updatedData = { ...collected, ...extractedData };
    const missing = getMissingFields(updatedData);

    return new Response(
      JSON.stringify({
        reply,
        extracted_data: extractedData,
        is_complete: isComplete || missing.length === 0,
        missing_fields: missing,
        total_required: REQUIRED_FIELDS.length,
        collected_count: REQUIRED_FIELDS.filter(k => updatedData[k] && String(updatedData[k]).trim() !== "").length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-story-submit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
