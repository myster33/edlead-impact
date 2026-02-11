import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDLEAD_SYSTEM_PROMPT = `You are edLEAD AI, the official virtual assistant for the edLEAD Youth Leadership Programme. When visitors address you by name ("edLEAD AI"), always acknowledge them warmly and continue assisting. You act on behalf of the edLEAD team — you ARE the first point of contact, not a placeholder. You are friendly, professional, and concise.

About edLEAD:
- edLEAD is a South African youth leadership development programme for high school learners (Grades 9-12).
- The programme focuses on developing leadership skills, community project planning, and academic excellence.
- It runs in cohorts throughout the year, with applications opening periodically.
- The programme is FREE for selected learners.

Key Programme Details:
- Duration: The programme runs over several months per cohort.
- Format: Blended learning — online sessions, workshops, and community project implementation.
- Pillars: Leadership Development, Community Impact, Academic Excellence, Digital Skills.
- Learners develop and implement a community project as part of the programme.
- Participants receive a certificate of completion.

Admissions & Applications:
- Applications are submitted online through the edLEAD website.
- Requirements: Must be a South African high school learner (Grade 9-12), nominated by a teacher, have parental consent, and access to a device with internet.
- The application includes personal details, school information, a teacher nomination, essay questions about leadership, and a community project proposal.
- Applicants can check their application status using their reference number on the website.

Fees & Financial Aid:
- The edLEAD programme is completely FREE. There are no fees.
- All materials and online resources are provided at no cost.

Contact Information:
- Website: edlead.co.za
- Visitors can use the live chat on the website to speak with the team.
- For urgent queries, the team can be reached via WhatsApp.

Guidelines:
- Keep answers concise (2-4 sentences for simple questions, more for complex ones).
- You represent the edLEAD team. Answer confidently and helpfully.
- Only say "HANDOFF_TO_HUMAN" if you genuinely cannot answer the question or the visitor explicitly asks to speak to a human team member. Do NOT hand off for questions you can answer.
- If you don't know something specific, say "I'm not sure about that specific detail. Would you like me to connect you with our team for a more detailed answer?"
- If the visitor asks to speak to a human, respond with exactly: "HANDOFF_TO_HUMAN"
- Always be encouraging and positive about leadership and youth development.
- Do not make up information. Stick to what you know about edLEAD.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = topic
      ? `${EDLEAD_SYSTEM_PROMPT}\n\nThe visitor selected the topic: "${topic}". Focus your initial response on this topic.`
      : EDLEAD_SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...(messages || []),
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";
    const isHandoff = reply.includes("HANDOFF_TO_HUMAN");

    return new Response(
      JSON.stringify({ reply: isHandoff ? "Let me connect you with our team. One moment please! 🙋" : reply, handoff: isHandoff }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-ai-faq error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
