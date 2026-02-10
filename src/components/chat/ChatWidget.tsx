import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  content: string;
  sender_type: "visitor" | "admin";
  created_at: string;
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
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [province, setProvince] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // Check for existing conversation on mount
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, visitor_name")
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
      }
    };
    checkExisting();
  }, []);

  // Realtime subscription for new messages and typing indicator
  useEffect(() => {
    if (!conversationId) return;

    const msgChannel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_type === "admin") {
            setAdminTyping(false);
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, content, sender_type, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  const startChat = async () => {
    if (!visitorName.trim()) return;

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        session_id: sessionId.current,
        visitor_name: visitorName.trim(),
        visitor_email: visitorEmail.trim() || null,
        visitor_province: province.trim() || null,
        visitor_country: "South Africa",
      })
      .select("id")
      .single();

    if (data && !error) {
      setConversationId(data.id);
      setStep("chat");

      // Send auto-greeting
      await supabase.from("chat_messages").insert({
        conversation_id: data.id,
        sender_type: "admin",
        content: `Hi ${visitorName.trim()}! 👋 Welcome to edLEAD. How can we help you today?`,
      });
      fetchMessages(data.id);
    }
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

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: newMessage.trim(),
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden" style={{ height: "500px" }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-sm">edLEAD Chat</h3>
          <p className="text-xs opacity-80">We typically reply in a few minutes</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {step === "intro" ? (
        <div className="flex-1 p-4 flex flex-col gap-3 justify-center">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Start a conversation with our team. Please share your details below.
          </p>
          <Input
            placeholder="Your name *"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
          />
          <Input
            placeholder="Email (optional)"
            type="email"
            value={visitorEmail}
            onChange={(e) => setVisitorEmail(e.target.value)}
          />
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">Select Province (optional)</option>
            <option value="Eastern Cape">Eastern Cape</option>
            <option value="Free State">Free State</option>
            <option value="Gauteng">Gauteng</option>
            <option value="KwaZulu-Natal">KwaZulu-Natal</option>
            <option value="Limpopo">Limpopo</option>
            <option value="Mpumalanga">Mpumalanga</option>
            <option value="North West">North West</option>
            <option value="Northern Cape">Northern Cape</option>
            <option value="Western Cape">Western Cape</option>
          </select>
          <Button onClick={startChat} disabled={!visitorName.trim()} className="w-full">
            Start Chat
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
           <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender_type === "visitor"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                    <p className={`text-[10px] mt-1 ${msg.sender_type === "visitor" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {adminTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                    <div className="flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
