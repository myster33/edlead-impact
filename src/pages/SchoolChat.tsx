import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Search,
  School,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface SchoolOption {
  id: string;
  name: string;
  province: string;
  logo_url: string | null;
  school_code: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type Step = "select-school" | "select-role" | "chat";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓" },
  { value: "parent", label: "Parent / Guardian", icon: "👨‍👩‍👧" },
  { value: "educator", label: "Educator / Teacher", icon: "📚" },
  { value: "guest", label: "Guest", icon: "👋" },
];

function generateSessionId() {
  return "sc_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function SchoolChat() {
  const [step, setStep] = useState<Step>("select-school");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSchools, setLoadingSchools] = useState(true);

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorRole, setVisitorRole] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load verified schools
  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSchools(true);
      const { data } = await supabase
        .from("schools")
        .select("id, name, province, logo_url, school_code")
        .eq("is_verified", true)
        .order("name");
      if (data) setSchools(data as SchoolOption[]);
      setLoadingSchools(false);
    };
    loadSchools();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.school_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSchool = (school: SchoolOption) => {
    setSelectedSchool(school);
    setStep("select-role");
  };

  const handleStartChat = () => {
    if (!visitorRole) return;
    setMessages([]);
    setConversationId(null);
    setStep("chat");

    // Send intro message from AI
    const intro: ChatMessage = {
      id: "intro",
      role: "assistant",
      content: `👋 Hi${visitorName ? ` ${visitorName}` : ""}! I'm the AI assistant for **${selectedSchool?.name}**. How can I help you today?`,
    };
    setMessages([intro]);

    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSwitchSchool = () => {
    setStep("select-school");
    setSelectedSchool(null);
    setMessages([]);
    setConversationId(null);
  };

  // Listen for admin replies via realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel("school-chat-visitor-" + conversationId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "school_chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        const newMsg = payload.new;
        // Only add admin (non-AI) messages that we didn't send
        if (newMsg.sender_type === "assistant" && !newMsg.is_ai_response) {
          const adminMsg: ChatMessage = {
            id: newMsg.id,
            role: "assistant",
            content: newMsg.content,
            senderName: newMsg.sender_name || "School Admin",
          };
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, adminMsg];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !selectedSchool) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const { data: conv } = await supabase
          .from("school_chat_conversations")
          .insert({
            school_id: selectedSchool.id,
            session_id: sessionId,
            visitor_name: visitorName || null,
            visitor_role: visitorRole,
          })
          .select("id")
          .single();
        if (conv) {
          convId = conv.id;
          setConversationId(conv.id);
        }
      }

      // Save user message
      if (convId) {
        await supabase.from("school_chat_messages").insert({
          conversation_id: convId,
          sender_type: "visitor",
          content: userMsg.content,
          is_ai_response: false,
        });
      }

      // Prepare message history for AI (exclude intro)
      const aiMessages = newMessages
        .filter(m => m.id !== "intro")
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("school-chat-ai", {
        body: {
          school_id: selectedSchool.id,
          messages: aiMessages,
          visitor_role: visitorRole,
          conversation_id: convId,
        },
      });

      // If AI is paused (admin is responding), don't show AI reply
      if (data?.ai_paused) {
        // AI is paused, admin is handling it
        setSending(false);
        return;
      }

      const reply = data?.reply || "Sorry, I couldn't process that. Please try again.";
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      };
      setMessages(prev => [...prev, aiMsg]);

      // Save AI response
      if (convId) {
        await supabase.from("school_chat_messages").insert({
          conversation_id: convId,
          sender_type: "assistant",
          content: reply,
          is_ai_response: true,
        });

        await supabase
          .from("school_chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convId);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Something went wrong. Please try again.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-lite (bold, links, line breaks)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|\n)/g);
    return parts.map((part, i) => {
      if (part === "\n") return <br key={i} />;
      const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>;
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) return <a key={i} href={linkMatch[2]} className="underline text-primary" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      <Helmet>
        <title>School Chat | edLEAD</title>
        <meta name="description" content="Chat with your school's AI assistant for quick answers about policies, fees, calendar, and more." />
      </Helmet>
      <div className="fixed inset-0 flex flex-col bg-background">
        {/* Header */}
        <header className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center gap-3">
          {step !== "select-school" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSwitchSchool}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedSchool?.logo_url ? (
              <img src={selectedSchool.logo_url} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <School className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">
                {selectedSchool ? selectedSchool.name : "edLEAD School Chat"}
              </h1>
              {selectedSchool && (
                <p className="text-xs text-muted-foreground truncate">{selectedSchool.province}</p>
              )}
            </div>
          </div>
          {step === "chat" && (
            <Button variant="ghost" size="sm" onClick={handleSwitchSchool} className="text-xs shrink-0">
              <RefreshCw className="h-3 w-3 mr-1" /> Switch
            </Button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === "select-school" && (
            <div className="h-full flex flex-col">
              <div className="p-4 space-y-3">
                <h2 className="text-lg font-semibold">Select a School</h2>
                <p className="text-sm text-muted-foreground">Choose a school to chat with their AI assistant.</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school name or code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 px-4 pb-4">
                {loadingSchools ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSchools.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No schools found.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredSchools.map(school => (
                      <button
                        key={school.id}
                        onClick={() => handleSelectSchool(school)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                      >
                        {school.logo_url ? (
                          <img src={school.logo_url} alt="" className="h-10 w-10 rounded-md object-contain" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <School className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{school.name}</p>
                          <p className="text-xs text-muted-foreground">{school.province} • {school.school_code}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {step === "select-role" && (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">Welcome to {selectedSchool?.name}</h2>
                <p className="text-sm text-muted-foreground">Tell us a bit about yourself to get started.</p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your name (optional)</label>
                  <Input
                    value={visitorName}
                    onChange={e => setVisitorName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">I am a...</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(role => (
                      <button
                        key={role.value}
                        onClick={() => setVisitorRole(role.value)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          visitorRole === role.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <span className="text-xl block mb-1">{role.icon}</span>
                        <span className="text-sm font-medium">{role.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleStartChat} disabled={!visitorRole} className="w-full">
                  Start Chat
                </Button>
              </div>
            </div>
          )}

          {step === "chat" && (
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {renderContent(msg.content)}
                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-border p-3">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!input.trim() || sending} aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Powered by edLEAD AI • Responses may not always be accurate
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
