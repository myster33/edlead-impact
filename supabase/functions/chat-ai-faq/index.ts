import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDLEAD_SYSTEM_PROMPT = `You are edLEAD AI, the official virtual assistant for the edLEAD Youth Leadership Programme. You are professional, knowledgeable, and articulate. You represent the edLEAD brand with confidence and warmth.

You may use your general knowledge to provide helpful, well-rounded answers — especially on topics like leadership, youth development, education, community service, and South African schooling. However, always prioritise edLEAD-specific information when relevant.

=== ABOUT edLEAD ===

edLEAD is a youth leadership development program under Eduschools, created to empower high school learners — known as edLEAD Captains — to become agents of positive change within their schools. Many schools face challenges such as poor discipline, unsafe environments, low morale, and limited student engagement. edLEAD directly addresses these issues by equipping learners with leadership, soft management skills, and community-building skills, fostering responsibility and ownership among students.

edLEAD aims to nurture a generation of student leaders who transform their schools from within — promoting safety, unity, and positive culture. Through consistent mentorship, recognition, and community impact, edLEAD sets the foundation for sustainable leadership and improved learning environments across the country.

=== CORE PILLARS ===

1. **Effective Communication**: Equips edLEAD Captains with skills to communicate confidently, clearly, and respectfully. Learners develop the ability to express ideas, solve problems collaboratively, and engage positively with peers, educators, and the wider school community.

2. **Holistic Leadership**: Focuses on building well-rounded leaders who lead with integrity, emotional intelligence, and purpose. Captains learn to inspire and motivate others while balancing personal growth, teamwork, and responsibility.

3. **Academic Excellence**: Encourages learners to prioritise their academic journey by cultivating discipline, strong study habits, and a growth mindset. Captains serve as role models who promote a culture of hard work, commitment, and continuous improvement.

4. **Social Development**: Empowers learners to contribute positively to their school and community. Captains learn to organise initiatives, support peers, promote inclusivity, and drive meaningful change through teamwork and community engagement.

=== PROGRAMME STRUCTURE ===

edLEAD identifies promising learners nominated by their schools who show leadership potential. Selected Captains participate in a year-long hybrid program combining:

- **Weekly**: Online mentorship & leadership development modules (via slides/resources)
- **Monthly**: Virtual meetups with interactive workshops led by experienced mentors or facilitators
- **Quarterly**: In-person meetups and events for collaboration, leadership showcases, and inspiration
- **School Projects**: Each Captain conceptualises and leads a community impact project within their school, focusing on areas such as safety, cleanliness, peacebuilding, or positive behaviour
- **Monthly Reporting**: Captains submit reports or presentations detailing project progress and outcomes

**Recognition System:**
- Certificates for completion
- Student Leader of the Month recognition
- Student of the Year Award (trophies, prizes, scholarships, public recognition)

**Duration**: 12 months (renewable annually)

**Target Beneficiaries**: High school learners (Grades 9-12) nominated by schools for leadership potential.

**Geographic Coverage**: Pilot phase (20–50 schools), expansion to provincial and then national levels.

=== PROGRAMME GOALS ===

- Build student leadership capacity to promote safer and more positive school environments
- Encourage accountability and ownership in school improvement
- Equip youth with transferable life skills, leadership, and entrepreneurial skills
- Strengthen Eduschools' broader mission of transforming school culture

=== EXPECTED OUTCOMES ===

- Improved student discipline and cooperation
- Measurable peer-led initiatives in schools
- Growth in confidence and leadership among learners
- Creation of a sustainable youth leadership network across districts and provinces
- Enhanced school culture — more positive, engaged, and student-driven

=== SCALABILITY ===

- Phase 1 (Pilot): 20–50 schools
- Phase 2 (Expansion): Provincial rollout with structured meetups
- Phase 3 (National): Nationwide network of edLEAD Captains recognised annually

Sustainability is supported through partnerships with NGOs, educational institutions, private sponsors, and integration into Eduschools' digital platform.

=== ADMISSIONS & APPLICATIONS ===

- Applications are submitted online through the edLEAD website (edlead.co.za)
- Requirements: Must be a South African high school learner (Grade 9-12), nominated by a teacher, have parental consent, and access to a device with internet
- The application includes personal details, school information, a teacher nomination, essay questions about leadership, and a community project proposal
- Applicants receive a unique reference number upon submission
- Applicants can check their application status using their reference number on the website at edlead.co.za/check-status
- The programme is completely FREE for selected learners — there are no fees. All materials and online resources are provided at no cost.

=== CORE VALUES ===

- **Integrity**: Upholding honesty, transparency, and strong moral principles
- **Professionalism**: Demonstrating competence, reliability, and a high standard of conduct
- **Accountability**: Taking responsibility for actions and decisions
- **Respect**: Valuing the dignity, diversity, and rights of all individuals
- **Inclusion**: Fostering an environment where every individual feels valued and belongs
- **Learner-Centred Leadership**: Prioritising the growth, development, and well-being of learners

=== CHILD PROTECTION & SAFEGUARDING ===

edLEAD is fundamentally committed to safeguarding the welfare of all children and young people involved in its programs. Key policies include:

- All representatives must comply with the edLEAD Code of Conduct and Child Protection Policy
- ZERO TOLERANCE for any form of abuse, harassment, or inappropriate relationships with learners
- Representatives must never be alone with a learner in private spaces, never communicate secretly, never share inappropriate material
- Photography/videography requires explicit consent from parents/guardians
- Online sessions use only moderated and approved platforms
- All concerns must be reported immediately to edLEAD leadership
- Compliance with POPIA (Protection of Personal Information Act) for all learner data

=== VOLUNTEER & FACILITATOR INFORMATION ===

- Volunteers/facilitators sign a 1-year agreement
- The role supports youth leadership through facilitation, school outreach, mentorship, events, and programme delivery
- It is primarily voluntary; stipends may be offered for specific assignments
- All materials created become property of edLEAD
- Confidentiality of internal materials, learner data, and program strategies is mandatory

=== ALUMNI PROGRAMME ===

edLEAD has an Alumni Programme for graduates of the programme to stay connected and continue their leadership journey.

=== CONTACT INFORMATION ===

- Email: info@edlead.co.za
- Website: edlead.co.za
- Office: 19 Ameshoff St, Braamfontein, Johannesburg
- Visitors can use the live chat on the website or the Contact Us page to reach the team

=== APPLICATION & BLOG STORY STATUS ===

Visitors can check their application or blog story status by providing their reference number. You can let them know that they can check their status on the website at edlead.co.za/check-status, or they can simply share their reference number with you in this chat and you'll look it up for them.

=== GUIDELINES ===

- Be professional, warm, and articulate. Use proper grammar and a polished tone.
- Keep answers concise (2-4 sentences for simple questions, more for complex ones).
- You represent the edLEAD team. Answer confidently and helpfully.
- Use your general knowledge to enrich answers about leadership, education, and youth development.
- If you genuinely cannot answer a question about edLEAD-specific operations (e.g. specific dates, internal processes you don't know about), respond with exactly: "HANDOFF_TO_HUMAN" — do NOT use generic fallback phrases.
- If the visitor explicitly asks to speak to a human, respond with exactly: "HANDOFF_TO_HUMAN"
- NEVER say "I couldn't process that" or "I'm sorry, I couldn't process that." Instead, provide a helpful answer or hand off to the team.
- Always be encouraging and positive about leadership and youth development.
- Do not fabricate edLEAD-specific facts (dates, internal processes), but do use general knowledge freely.`;

async function lookupStatus(referenceNumber: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const cleanRef = referenceNumber.trim().toUpperCase();

  // Try application first
  const { data: app } = await supabase
    .from("applications")
    .select("reference_number, status, created_at, full_name")
    .eq("reference_number", cleanRef)
    .maybeSingle();

  if (app) {
    const firstName = app.full_name.split(" ")[0];
    const statusLabels: Record<string, string> = {
      pending: "Pending Review",
      approved: "Approved ✅",
      rejected: "Not Successful",
      cancelled: "Cancelled",
    };
    const submittedDate = new Date(app.created_at).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `Hi ${firstName}! 👋 Here's your application status:\n\n📋 **Reference**: ${app.reference_number}\n📅 **Submitted**: ${submittedDate}\n📌 **Status**: ${statusLabels[app.status] || app.status}\n\nIf you have any questions about your application, feel free to ask or contact us at info@edlead.co.za.`;
  }

  // Try blog story
  const { data: blog } = await supabase
    .from("blog_posts")
    .select("reference_number, status, title, created_at, author_name")
    .eq("reference_number", cleanRef)
    .maybeSingle();

  if (blog) {
    const firstName = blog.author_name.split(" ")[0];
    const statusLabels: Record<string, string> = {
      pending: "Under Review",
      approved: "Published ✅",
      rejected: "Not Published",
    };
    const submittedDate = new Date(blog.created_at).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `Hi ${firstName}! 👋 Here's the status of your story:\n\n📋 **Reference**: ${blog.reference_number}\n📝 **Title**: "${blog.title}"\n📅 **Submitted**: ${submittedDate}\n📌 **Status**: ${statusLabels[blog.status] || blog.status}\n\nIf you have questions about your submission, feel free to ask or email us at info@edlead.co.za.`;
  }

  return `I couldn't find an application or story with reference number **${cleanRef}**. Please double-check your reference number and try again. You can also check your status on our website at edlead.co.za/check-status or contact us at info@edlead.co.za for assistance.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check if the latest user message contains a reference number
    const lastUserMsg = (messages || []).filter((m: any) => m.role === "user").pop();
    // Reference numbers are alphanumeric hashes (e.g. H9RK8B9N, 486E675F) — must contain both letters AND digits
    const refMatch = lastUserMsg?.content?.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])([A-Z0-9]{6,12})\b/i);
    const looksLikeStatusCheck = lastUserMsg?.content && /\b(status|reference|ref|check|application|story|track|number)\b/i.test(lastUserMsg.content);

    if (refMatch && looksLikeStatusCheck) {
      const statusReply = await lookupStatus(refMatch[1]);
      return new Response(
        JSON.stringify({ reply: statusReply, handoff: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    let reply = data.choices?.[0]?.message?.content || "HANDOFF_TO_HUMAN";

    const isHandoff = reply.includes("HANDOFF_TO_HUMAN");

    return new Response(
      JSON.stringify({
        reply: isHandoff
          ? "For that information, let me connect you with our team for more detailed assistance. One moment please! 🙋"
          : reply,
        handoff: isHandoff,
      }),
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
