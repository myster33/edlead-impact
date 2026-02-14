import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Minimize2, Maximize2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ChatIntroForm } from "./ChatIntroForm";
import { ChatTopicButtons } from "./ChatTopicButtons";
import { ChatMessageList } from "./ChatMessageList";
import { ChatApplyActions } from "./ChatApplyActions";
import { ChatApplyReview } from "./ChatApplyReview";
import edleadIcon from "@/assets/edlead-icon.png";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  content: string;
  sender_type: "visitor" | "admin";
  created_at: string;
  is_ai_response?: boolean;
  sender_name?: string;
}

const getSessionId = () => {
  let id = localStorage.getItem("edlead-chat-session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("edlead-chat-session", id);
  }
  return id;
};

export function ChatWidget() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [step, setStep] = useState<"intro" | "topics" | "chat">("intro");
  const [visitorName, setVisitorName] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastHumanAdminMsgTime = useRef<number>(0);
  const humanAdminResumeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Apply mode state
  const [applyMode, setApplyMode] = useState(false);
  const [applicationData, setApplicationData] = useState<Record<string, any>>({});
  const [applyComplete, setApplyComplete] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyCollectedCount, setApplyCollectedCount] = useState(0);
  const [applyTotalRequired, setApplyTotalRequired] = useState(30);
  const [showReview, setShowReview] = useState(false);

  // Show tooltip on first visit
  useEffect(() => {
    const seen = localStorage.getItem("edlead-chat-tooltip-seen");
    if (!seen) {
      const t = setTimeout(() => setShowTooltip(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  // Persist apply mode in localStorage
  useEffect(() => {
    if (applyMode) {
      localStorage.setItem("edlead-chat-apply-mode", "true");
      localStorage.setItem("edlead-chat-apply-data", JSON.stringify(applicationData));
    } else {
      localStorage.removeItem("edlead-chat-apply-mode");
      localStorage.removeItem("edlead-chat-apply-data");
    }
  }, [applyMode, applicationData]);

  // Check for existing conversation on mount
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, visitor_name, escalated_to_whatsapp")
        .eq("session_id", sessionId.current)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setConversationId(data.id);
        setVisitorName(data.visitor_name || "");
        setStep("chat");
        fetchMessages(data.id);

        // Restore apply mode if it was active and name matches
        const savedApplyMode = localStorage.getItem("edlead-chat-apply-mode");
        if (savedApplyMode === "true") {
          try {
            const savedData = localStorage.getItem("edlead-chat-apply-data");
            const parsed = savedData ? JSON.parse(savedData) : {};
            const savedName = (parsed.full_name || "").toLowerCase().trim();
            const currentName = (data.visitor_name || "").toLowerCase().trim();
            if (savedName && currentName && savedName === currentName) {
              setApplyMode(true);
              setApplicationData(parsed);
            } else {
              // Name mismatch — clear stale apply data
              localStorage.removeItem("edlead-chat-apply-mode");
              localStorage.removeItem("edlead-chat-apply-data");
            }
          } catch {
            localStorage.removeItem("edlead-chat-apply-mode");
            localStorage.removeItem("edlead-chat-apply-data");
          }
        }
      }
    };
    checkExisting();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const msgChannel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, { ...msg, is_ai_response: msg.is_ai_response || false }];
          });
          if (msg.sender_type === "admin" && !msg.is_ai_response) {
            setAdminTyping(false);
            lastHumanAdminMsgTime.current = Date.now();
          }
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`chat-typing-${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender === "admin") {
          setAdminTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, aiLoading]);

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, content, sender_type, created_at, is_ai_response, sender_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) {
      const adminIds = [...new Set(data.filter(m => m.sender_id).map(m => m.sender_id!))];
      let adminNames: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id, full_name")
          .in("id", adminIds);
        admins?.forEach(a => { adminNames[a.id] = a.full_name || "Team Member"; });
      }
      setMessages(data.map(m => ({
        ...m,
        sender_name: m.sender_id ? adminNames[m.sender_id] : undefined,
      })) as ChatMessage[]);
    }
  };

  const isHumanAdminActive = useCallback(() => {
    return lastHumanAdminMsgTime.current > 0 && (Date.now() - lastHumanAdminMsgTime.current) < 15000;
  }, []);

  const callAiFaq = async (convId: string, userMessages: { role: string; content: string }[], topic?: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai-faq", {
        body: { messages: userMessages, topic },
      });
      if (error) throw error;

      const reply = data?.reply || "I'm sorry, I couldn't process that right now.";
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        sender_type: "admin",
        content: reply,
        is_ai_response: true,
      });
    } catch (e) {
      console.error("AI FAQ error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Apply mode: call chat-apply edge function
  const callApplyAi = async (convId: string, userMessages: { role: string; content: string }[]) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-apply", {
        body: {
          messages: userMessages,
          collected_data: applicationData,
          visitor_name: visitorName,
        },
      });
      if (error) throw error;

      const reply = data?.reply || "Let's continue with your application!";
      const extractedData = data?.extracted_data || {};
      const isComplete = data?.is_complete || false;

      // Update application data with newly extracted fields
      if (Object.keys(extractedData).length > 0) {
        setApplicationData(prev => ({ ...prev, ...extractedData }));
      }

      setApplyComplete(isComplete);
      setApplyCollectedCount(data?.collected_count || 0);
      setApplyTotalRequired(data?.total_required || 30);

      // Store AI response
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        sender_type: "admin",
        content: reply,
        is_ai_response: true,
      });
    } catch (e) {
      console.error("Apply AI error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const startApplyMode = async () => {
    if (!conversationId) return;
    setApplyMode(true);
    setStep("chat");

    // Send initial message
    const visitorMsg = "I'd like to apply to the edLEAD programme right here in the chat!";
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: visitorMsg,
    });

    // Pre-fill name and email from intro form
    const initialData: Record<string, any> = {};
    if (visitorName) initialData.full_name = visitorName;
    if (visitorEmail) initialData.student_email = visitorEmail;
    setApplicationData(initialData);

    // Get first AI response
    const aiMessages = [{ role: "user", content: visitorMsg }];
    await callApplyAi(conversationId, aiMessages);
  };

  const handlePhotoUploaded = (url: string) => {
    setApplicationData(prev => ({ ...prev, learner_photo_url: url }));
    // Add a message about the photo
    if (conversationId) {
      supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: "📸 Passport photo uploaded successfully! ✓",
        is_ai_response: true,
      });
    }
  };

  const handleApplySubmit = async () => {
    if (!conversationId || applySubmitting) return;
    setApplySubmitting(true);

    try {
      const isGraduate = applicationData.grade === "High School Graduate";
      const toISODate = (d: Date) => d.toISOString().split("T")[0];

      const payload = {
        full_name: applicationData.full_name || "",
        date_of_birth: applicationData.date_of_birth || "",
        gender: applicationData.gender || null,
        grade: applicationData.grade || "",
        school_name: applicationData.school_name || "",
        school_address: applicationData.school_address || "",
        country: applicationData.country || "South Africa",
        province: applicationData.province || "",
        student_email: applicationData.student_email || "",
        student_phone: applicationData.student_phone || "",
        parent_name: applicationData.parent_name || "",
        parent_relationship: applicationData.parent_relationship || "",
        parent_email: applicationData.parent_email || "",
        parent_phone: applicationData.parent_phone || "",
        parent_consent: applicationData.parent_consent === "yes",
        nominating_teacher: isGraduate ? "Self-Nominated" : (applicationData.nominating_teacher || ""),
        teacher_position: isGraduate ? "N/A" : (applicationData.teacher_position || ""),
        school_email: isGraduate ? (applicationData.student_email || "") : (applicationData.school_email || ""),
        school_contact: isGraduate ? (applicationData.student_phone || "") : (applicationData.school_contact || ""),
        formally_nominated: isGraduate ? false : applicationData.formally_nominated === "yes",
        is_learner_leader: applicationData.is_learner_leader === "yes",
        leader_roles: applicationData.leader_roles || null,
        school_activities: applicationData.school_activities || "",
        why_edlead: applicationData.why_edlead || "",
        leadership_meaning: applicationData.leadership_meaning || "",
        school_challenge: applicationData.school_challenge || "",
        project_idea: applicationData.project_idea || "",
        project_problem: applicationData.project_problem || "",
        project_benefit: applicationData.project_benefit || "",
        project_team: applicationData.project_team || "",
        manage_schoolwork: applicationData.manage_schoolwork || "",
        academic_importance: applicationData.academic_importance || "",
        willing_to_commit: applicationData.willing_to_commit === "yes",
        has_device_access: applicationData.has_device_access === "yes",
        learner_signature: applicationData.full_name || "",
        learner_signature_date: toISODate(new Date()),
        parent_signature_name: applicationData.parent_name || "",
        parent_signature: applicationData.parent_name || "",
        parent_signature_date: toISODate(new Date()),
        video_link: null,
        learner_photo_url: applicationData.learner_photo_url || null,
      };

      const { data, error } = await supabase.functions.invoke("submit-application", {
        body: payload,
      });

      if (error) throw error;

      const refNumber = data?.referenceNumber || data?.applicationId?.slice(0, 8).toUpperCase() || "SUBMITTED";

      // Post success message
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: `🎉 **Your application has been submitted successfully!**\n\n📋 **Reference Number**: ${refNumber}\n\nYou'll receive a confirmation email shortly. You can check your application status anytime at [edlead.co.za/check-status](/check-status) or share your reference number with us in this chat.\n\nWelcome to the edLEAD journey! 🌟`,
        is_ai_response: true,
      });

      setApplyMode(false);
      setApplyComplete(false);
      setApplicationData({});

      toast({
        title: "Application Submitted!",
        description: "Your edLEAD application has been submitted via chat.",
      });
    } catch (error: any) {
      console.error("Chat submit error:", error);

      let errorMsg = "There was an error submitting your application. Please try again.";
      try {
        if (error?.context instanceof Response) {
          const body = await error.context.clone().json().catch(() => null);
          if (body?.details?.length) {
            errorMsg = body.details.slice(0, 3).join(" • ");
          } else if (body?.error) {
            errorMsg = body.error;
          }
        }
      } catch { /* ignore */ }

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "admin",
        content: `❌ Submission failed: ${errorMsg}\n\nPlease check your details and try again, or visit [edlead.co.za/apply](/apply) to submit the full application form.`,
        is_ai_response: true,
      });

      toast({
        title: "Submission Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setApplySubmitting(false);
    }
  };

  const startChat = async (name: string, email: string, phone: string, province: string) => {
    if (!name.trim()) return;
    setVisitorName(name.trim());
    setVisitorEmail(email.trim());

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        session_id: sessionId.current,
        visitor_name: name.trim(),
        visitor_email: email.trim() || null,
        visitor_phone: phone.trim() || null,
        visitor_province: province.trim() || null,
        visitor_country: "South Africa",
      })
      .select("id")
      .single();

    if (data && !error) {
      setConversationId(data.id);
      await supabase.from("chat_messages").insert({
        conversation_id: data.id,
        sender_type: "admin",
        content: `Hi ${name.trim()}! 👋 Welcome to edLEAD. How can we help you today?`,
        is_ai_response: true,
      });
      await fetchMessages(data.id);
      setStep("topics");
    }
  };

  const handleTopicSelect = async (topic: string) => {
    if (!conversationId) return;

    await supabase
      .from("chat_conversations")
      .update({ chat_topic: topic })
      .eq("id", conversationId);

    const topicLabels: Record<string, string> = {
      admissions: "Admissions & Applications",
      programme: "Programme Information",
      fees: "Fees & Financial Aid",
      contact: "Contact & Location",
      other: "Other Question",
    };

    const visitorMsg = `I'd like to know about: ${topicLabels[topic] || topic}`;
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: visitorMsg,
    });

    setStep("chat");
    await callAiFaq(conversationId, [{ role: "user", content: visitorMsg }], topic);
  };

  const broadcastTyping = useCallback(() => {
    if (!conversationId) return;
    supabase.channel(`chat-typing-${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { sender: "visitor" },
    });
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;
    setSending(true);
    const msgContent = newMessage.trim();
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: msgContent,
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    setSending(false);

    // Build message history for AI
    const history = [...messages, { id: "temp", content: msgContent, sender_type: "visitor" as const, created_at: new Date().toISOString() }];
    const aiMessages = history.map((m) => ({
      role: m.sender_type === "visitor" ? "user" : "assistant",
      content: m.content,
    }));

    if (applyMode) {
      // In apply mode — use chat-apply
      setAiLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setAiLoading(false);
      await callApplyAi(conversationId, aiMessages);
    } else if (isHumanAdminActive()) {
      clearTimeout(humanAdminResumeTimer.current);
      humanAdminResumeTimer.current = setTimeout(async () => {
        setAiLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setAiLoading(false);
        await callAiFaq(conversationId, aiMessages);
      }, 15000);
    } else {
      setAiLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAiLoading(false);
      await callAiFaq(conversationId, aiMessages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setShowTooltip(false);
    localStorage.setItem("edlead-chat-tooltip-seen", "true");
  };

  // Cleanup timers
  useEffect(() => {
    return () => clearTimeout(humanAdminResumeTimer.current);
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {showTooltip && (
          <div className="bg-card border rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-foreground animate-in slide-in-from-right-2 fade-in-0">
            Chat with us! 💬
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-card border-r border-b rotate-[-45deg]" />
          </div>
        )}
        <button
          onClick={handleOpen}
          className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
          aria-label="Open chat"
        >
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <span className="relative">
            <MessageCircle className="h-6 w-6" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-300 transition-all ${
      isMaximized
        ? "bottom-4 right-4 left-4 sm:left-auto sm:w-[700px] sm:right-6 sm:bottom-6 max-sm:right-2 max-sm:bottom-2 max-sm:left-2"
        : "bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] sm:w-[380px] max-sm:w-[calc(100vw-1rem)] max-sm:right-2 max-sm:bottom-2 max-sm:left-2 max-sm:max-w-none"
    }`} style={{ height: isMaximized ? "min(85vh, 800px)" : "520px" }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={edleadIcon} alt="edLEAD" className="h-8 w-8 rounded-full bg-primary-foreground/10 p-0.5" />
          <div>
            <h3 className="font-semibold text-sm">
              {applyMode ? "edLEAD Application" : "edLEAD Chat"}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs opacity-80">
                {applyMode ? "Applying via chat" : "Online · We reply in minutes"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {step === "intro" ? (
        <ChatIntroForm onStart={startChat} />
      ) : step === "topics" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatMessageList messages={messages} adminTyping={adminTyping} aiLoading={aiLoading} ref={scrollRef} />
          <ChatTopicButtons onSelect={handleTopicSelect} onApply={startApplyMode} disabled={aiLoading} />
        </div>
      ) : (
        <>
          <ChatMessageList messages={messages} adminTyping={adminTyping} aiLoading={aiLoading} ref={scrollRef} />

          {/* Apply mode actions */}
          {applyMode && !showReview && (
            <ChatApplyActions
              applicationData={applicationData}
              onPhotoUploaded={handlePhotoUploaded}
              onSubmit={() => setShowReview(true)}
              isComplete={applyComplete}
              isSubmitting={applySubmitting}
              collectedCount={applyCollectedCount}
              totalRequired={applyTotalRequired}
            />
          )}

          {/* Review step before final submit */}
          {applyMode && showReview && (
            <ChatApplyReview
              applicationData={applicationData}
              onSubmit={handleApplySubmit}
              onEdit={() => setShowReview(false)}
              onFieldUpdate={(field, value) => setApplicationData(prev => ({ ...prev, [field]: value }))}
              isSubmitting={applySubmitting}
            />
          )}

          {/* Input */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder={applyMode ? "Answer here..." : "Type a message..."}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={sending || aiLoading}
              />
              <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || sending || aiLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
