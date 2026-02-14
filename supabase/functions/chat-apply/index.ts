import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED_FIELDS = [
  "full_name", "date_of_birth", "gender", "grade",
  "school_name", "school_address", "country", "province",
  "student_email", "student_phone",
  "parent_name", "parent_relationship", "parent_email", "parent_phone", "parent_consent",
  "is_learner_leader", "school_activities",
  "why_edlead", "leadership_meaning", "school_challenge",
  "project_idea", "project_problem", "project_benefit", "project_team",
  "manage_schoolwork", "academic_importance",
  "willing_to_commit", "has_device_access",
];

const NOMINATION_FIELDS = [
  "nominating_teacher", "teacher_position", "school_email", "school_contact", "formally_nominated",
];

function getMissingFields(collected: Record<string, any>): string[] {
  const required = [...REQUIRED_FIELDS];
  const isGraduate = collected.grade === "High School Graduate";
  if (!isGraduate) {
    required.push(...NOMINATION_FIELDS);
  }
  return required.filter(f => !collected[f] || (typeof collected[f] === "string" && collected[f].trim() === ""));
}

function buildSystemPrompt(collected: Record<string, any>) {
  const missing = getMissingFields(collected);
  const isGraduate = collected.grade === "High School Graduate";
  const collectedSummary = Object.entries(collected)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `You are edLEAD's friendly Application Assistant, helping a visitor apply to the edLEAD Youth Leadership Programme directly through chat. Your job is to collect all required application information conversationally.

=== YOUR APPROACH ===
- Ask 2-3 related questions at a time, grouped logically
- Be warm, encouraging, and professional
- For essay/long-text questions (why_edlead, leadership_meaning, school_challenge, project_idea, project_problem, project_benefit, project_team, manage_schoolwork, academic_importance), ask simpler sub-questions to help the applicant. Then compose a well-written 2-4 sentence answer from their input that you save as the field value.
- For yes/no fields (parent_consent, is_learner_leader, formally_nominated, willing_to_commit, has_device_access), phrase naturally and record "yes" or "no"
- Validate data as you go (e.g., email format, date format YYYY-MM-DD, grade must be one of: Grade 9, Grade 10, Grade 11, Grade 12, High School Graduate)
- If the applicant provides a grade of "High School Graduate", skip nomination fields (nominating_teacher, teacher_position, school_email, school_contact, formally_nominated) and mention they can self-nominate
- Country defaults to "South Africa" if not specified
- For province, use the appropriate region for the country

=== QUESTION FLOW ===
Follow this order:
1. Personal info: full_name, date_of_birth (ask for their birthday in a natural way, convert to YYYY-MM-DD), gender (optional), grade
2. School: school_name, school_address, country, province
3. Contact: student_email, student_phone
4. Parent/Guardian: parent_name, parent_relationship, parent_email, parent_phone, parent_consent
5. Nomination (skip if graduate): nominating_teacher, teacher_position, school_email, school_contact, formally_nominated
6. Leadership: is_learner_leader, leader_roles (optional, only if leader), school_activities
7. Motivation (HELP COMPOSE): why_edlead, leadership_meaning, school_challenge
8. Impact Project (HELP COMPOSE): project_idea, project_problem, project_benefit, project_team
9. Commitment: manage_schoolwork, academic_importance, willing_to_commit, has_device_access

=== COMPOSING LONG ANSWERS ===
For essay fields, DON'T just ask "What is your project idea?" Instead:
- For project_idea: "What kind of project would you like to do at your school? What area would it focus on — like safety, cleanliness, or school spirit?"
- For why_edlead: "What interests you about leadership? Why do you think edLEAD could help you grow?"
- Take their casual answers and compose articulate, well-written responses (2-4 sentences each)

=== PHOTO ===
The photo will be uploaded separately via a button in the chat. Don't ask for it directly, but mention it when you're near the end: "You can also upload or take your passport photo using the camera button below."

=== CURRENTLY COLLECTED ===
${collectedSummary || "Nothing collected yet — this is the start of the application."}

=== STILL NEEDED ===
${missing.length > 0 ? missing.join(", ") : "ALL FIELDS COLLECTED! Tell the visitor their application is ready and they can click the Submit button below."}

=== CRITICAL RULES ===
- ALWAYS use the respond_and_collect tool for EVERY response
- Only include fields in extracted_data that the visitor JUST provided in their latest message
- Don't re-extract data that's already been collected
- Keep replies concise and conversational
- If all fields are collected, set is_complete to true and congratulate them
- For boolean fields, convert to "yes" or "no" strings`;
}

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "respond_and_collect",
    description: "Provide a conversational reply and extract any new application data from the visitor's message",
    parameters: {
      type: "object",
      properties: {
        reply: { type: "string", description: "Your conversational reply to the visitor" },
        extracted_data: {
          type: "object",
          description: "New application fields extracted from the visitor's latest message. Only include fields that were just provided.",
          properties: {
            full_name: { type: "string" },
            date_of_birth: { type: "string", description: "YYYY-MM-DD format" },
            gender: { type: "string" },
            grade: { type: "string", description: "Must be: Grade 9, Grade 10, Grade 11, Grade 12, or High School Graduate" },
            school_name: { type: "string" },
            school_address: { type: "string" },
            country: { type: "string" },
            province: { type: "string" },
            student_email: { type: "string" },
            student_phone: { type: "string" },
            parent_name: { type: "string" },
            parent_relationship: { type: "string" },
            parent_email: { type: "string" },
            parent_phone: { type: "string" },
            parent_consent: { type: "string", description: "yes or no" },
            nominating_teacher: { type: "string" },
            teacher_position: { type: "string" },
            school_email: { type: "string" },
            school_contact: { type: "string" },
            formally_nominated: { type: "string", description: "yes or no" },
            is_learner_leader: { type: "string", description: "yes or no" },
            leader_roles: { type: "string" },
            school_activities: { type: "string" },
            why_edlead: { type: "string" },
            leadership_meaning: { type: "string" },
            school_challenge: { type: "string" },
            project_idea: { type: "string" },
            project_problem: { type: "string" },
            project_benefit: { type: "string" },
            project_team: { type: "string" },
            manage_schoolwork: { type: "string" },
            academic_importance: { type: "string" },
            willing_to_commit: { type: "string", description: "yes or no" },
            has_device_access: { type: "string", description: "yes or no" },
          },
        },
        is_complete: { type: "boolean", description: "True if all required fields have been collected" },
      },
      required: ["reply", "extracted_data", "is_complete"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, collected_data, visitor_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const collected = collected_data || {};
    const systemPrompt = buildSystemPrompt(collected);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "respond_and_collect" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let reply = "Let's continue with your application! What would you like to share next?";
    let extractedData: Record<string, any> = {};
    let isComplete = false;

    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        reply = args.reply || reply;
        extractedData = args.extracted_data || {};
        isComplete = args.is_complete || false;

        // Clean extracted data - remove empty/null values
        Object.keys(extractedData).forEach(key => {
          if (extractedData[key] === null || extractedData[key] === undefined || extractedData[key] === "") {
            delete extractedData[key];
          }
        });
      } catch (e) {
        console.error("Failed to parse tool call:", e);
        // Fall back to text content
        reply = data.choices?.[0]?.message?.content || reply;
      }
    } else {
      // No tool call - use text content
      reply = data.choices?.[0]?.message?.content || reply;
    }

    // Merge new data with existing
    const updatedData = { ...collected, ...extractedData };
    const missing = getMissingFields(updatedData);

    return new Response(
      JSON.stringify({
        reply,
        extracted_data: extractedData,
        is_complete: isComplete || missing.length === 0,
        missing_fields: missing,
        total_required: REQUIRED_FIELDS.length + (updatedData.grade === "High School Graduate" ? 0 : NOMINATION_FIELDS.length),
        collected_count: Object.keys(updatedData).filter(k => updatedData[k] && String(updatedData[k]).trim() !== "").length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-apply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
