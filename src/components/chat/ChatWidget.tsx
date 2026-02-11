import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Minimize2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ChatIntroForm } from "./ChatIntroForm";
import { ChatTopicButtons } from "./ChatTopicButtons";
import { ChatMessageList } from "./ChatMessageList";
// ChatContactForm removed — visitors are directed to the Contact Us page instead
import edleadIcon from "@/assets/edlead-icon.png";

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
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "topics" | "chat">("intro");
  const [visitorName, setVisitorName] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [escalated, setEscalated] = useState(false);
  // showContactForm removed — visitors directed to Contact Us page
  const [visitorEmail, setVisitorEmail] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const aiAutoContinueCount = useRef(0);

  // Show tooltip on first visit
  useEffect(() => {
    const seen = localStorage.getItem("edlead-chat-tooltip-seen");
    if (!seen) {
      const t = setTimeout(() => setShowTooltip(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

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
        setEscalated(!!data.escalated_to_whatsapp);
        setStep("chat");
        fetchMessages(data.id);
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
            // Admin responded — clear escalation timer and reset AI counter
            clearTimeout(escalationTimerRef.current);
            aiAutoContinueCount.current = 0;
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
      // ScrollArea uses an inner viewport div
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
      // Fetch admin names for messages with sender_id
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

  const startEscalationTimer = useCallback((convId: string) => {
    clearTimeout(escalationTimerRef.current);
    escalationTimerRef.current = setTimeout(async () => {
      if (aiAutoContinueCount.current >= 3) {
        // After 3 AI auto-continues, team is away — direct to Contact Us page
        setEscalated(true);
        aiAutoContinueCount.current = 0;

        // Send away message as AI
        await supabase.from("chat_messages").insert({
          conversation_id: convId,
          sender_type: "admin",
          content: "Our team is currently away. 🕐 I'd recommend browsing our website at edlead.co.za for more information, or click the **Contact Us** button on our website and leave us your query — our team will get back to you ASAP. You can also email us directly at info@edlead.co.za 📧",
          is_ai_response: true,
        });
      } else {
        // AI auto-continues the conversation
        aiAutoContinueCount.current += 1;
        try {
          const history = messages.map((m) => ({
            role: m.sender_type === "visitor" ? "user" : "assistant",
            content: m.content,
          }));
          await callAiFaq(convId, history);
        } catch (e) {
          console.error("AI auto-continue failed:", e);
        }
      }
    }, 15 * 1000); // 15 seconds (temporary for testing)
  }, [messages]);

  const callAiFaq = async (convId: string, userMessages: { role: string; content: string }[], topic?: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai-faq", {
        body: { messages: userMessages, topic },
      });

      if (error) throw error;

      const reply = data?.reply || "I'm sorry, I couldn't process that right now.";
      const handoff = data?.handoff || false;

      // Store AI response as admin message with is_ai_response flag
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        sender_type: "admin",
        content: reply,
        is_ai_response: true,
      });

      if (handoff) {
        // Start escalation timer when handing off to human
        startEscalationTimer(convId);
      }
    } catch (e) {
      console.error("AI FAQ error:", e);
    } finally {
      setAiLoading(false);
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

      // Send auto-greeting
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

    // Update conversation topic
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

    // Send visitor message about the topic
    const visitorMsg = `I'd like to know about: ${topicLabels[topic] || topic}`;
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: visitorMsg,
    });

    setStep("chat");

    // Get AI response
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

    // Check if a real admin has replied (non-AI message from admin)
    const hasHumanAdmin = messages.some((m) => m.sender_type === "admin" && !m.is_ai_response);

    if (!hasHumanAdmin) {
      // AI mode — respond automatically
      await callAiFaq(conversationId, aiMessages);
      // Start escalation timer
      startEscalationTimer(conversationId);
    } else {
      // Human admin is active, start escalation timer in case they don't respond
      startEscalationTimer(conversationId);
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

  // Cleanup escalation timer
  useEffect(() => {
    return () => clearTimeout(escalationTimerRef.current);
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
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          <span className="relative">
            <MessageCircle className="h-6 w-6" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-300 sm:w-[380px] max-sm:w-[calc(100vw-1rem)] max-sm:right-2 max-sm:bottom-2 max-sm:left-2 max-sm:max-w-none" style={{ height: "520px" }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={edleadIcon} alt="edLEAD" className="h-8 w-8 rounded-full bg-primary-foreground/10 p-0.5" />
          <div>
            <h3 className="font-semibold text-sm">edLEAD Chat</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs opacity-80">Online · We reply in minutes</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
            <Minimize2 className="h-4 w-4" />
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
          <ChatTopicButtons onSelect={handleTopicSelect} disabled={aiLoading} />
        </div>
      ) : (
        <>
          <ChatMessageList messages={messages} adminTyping={adminTyping} aiLoading={aiLoading} ref={scrollRef} />

          {/* Contact form removed — visitors directed to Contact Us page */}

          {/* Input */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
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
