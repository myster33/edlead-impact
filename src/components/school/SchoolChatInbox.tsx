import { useState, useEffect, useRef, useCallback } from "react";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle, Send, User, Bot, ArrowLeft, Loader2, Clock,
} from "lucide-react";
import edleadIcon from "@/assets/edlead-icon.png";

interface Conversation {
  id: string;
  visitor_name: string | null;
  visitor_role: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  ai_paused: boolean;
  admin_last_reply_at: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  is_ai_response: boolean;
  created_at: string;
  sender_name: string | null;
}

export default function SchoolChatInbox() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("school_chat_conversations")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);
    if (data) setConversations(data);
    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime for conversations list
  useEffect(() => {
    if (!currentSchool?.id) return;
    const channel = supabase
      .channel("school-chat-convos")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "school_chat_conversations",
        filter: `school_id=eq.${currentSchool.id}`,
      }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentSchool?.id, fetchConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from("school_chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages(data);
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv, loadMessages]);

  // Realtime for messages
  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel("school-chat-msgs-" + selectedConv.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "school_chat_messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setMessages([]);
  };

  const sendAdminReply = async () => {
    if (!input.trim() || sending || !selectedConv || !schoolUser) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      // Insert admin message
      await (supabase as any).from("school_chat_messages").insert({
        conversation_id: selectedConv.id,
        sender_type: "assistant",
        content,
        is_ai_response: false,
        sender_name: schoolUser.full_name,
      });

      // Pause AI and update last reply time
      await (supabase as any)
        .from("school_chat_conversations")
        .update({
          ai_paused: true,
          admin_last_reply_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConv.id);

      setSelectedConv(prev => prev ? { ...prev, ai_paused: true, admin_last_reply_at: new Date().toISOString() } : prev);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConv) return;
    await (supabase as any)
      .from("school_chat_conversations")
      .update({ status: "closed", ai_paused: false })
      .eq("id", selectedConv.id);
    setSelectedConv(null);
    fetchConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAdminReply();
    }
  };

  const roleEmoji: Record<string, string> = {
    student: "🎓",
    parent: "👨‍👩‍👧",
    educator: "📚",
    guest: "👋",
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Conversation list view
  if (!selectedConv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Live Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No chat conversations yet.</p>
              <p className="text-sm">When visitors chat with your school's AI, conversations will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                    {roleEmoji[conv.visitor_role] || "👋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {conv.visitor_name || "Anonymous"}
                      </span>
                      <Badge variant="secondary" className="text-xs capitalize">{conv.visitor_role}</Badge>
                      <Badge variant={conv.status === "open" ? "default" : "outline"} className="text-xs">
                        {conv.status}
                      </Badge>
                      {conv.ai_paused && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          AI Paused
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Chat detail view
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedConv(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{roleEmoji[selectedConv.visitor_role] || "👋"}</span>
              <CardTitle className="text-base truncate">
                {selectedConv.visitor_name || "Anonymous"}
              </CardTitle>
              <Badge variant="secondary" className="text-xs capitalize">{selectedConv.visitor_role}</Badge>
              {selectedConv.ai_paused && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  AI Paused — you're responding
                </Badge>
              )}
            </div>
          </div>
          {selectedConv.status === "open" && (
            <Button variant="outline" size="sm" onClick={handleCloseConversation}>
              Close Chat
            </Button>
          )}
        </div>
      </CardHeader>
      <Separator />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMsgs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet.</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "visitor" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.sender_type === "visitor"
                    ? "bg-muted text-foreground rounded-bl-sm"
                    : msg.is_ai_response
                    ? "bg-primary/10 text-foreground rounded-br-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm"
                }`}
              >
                {msg.sender_type === "assistant" && (
                  <span className="block text-[10px] font-semibold mb-0.5">
                    {msg.is_ai_response ? (
                      <span className="inline-flex items-center gap-1">
                        <img src={edleadIcon} alt="" className="h-3 w-3 rounded-sm" /> edLEAD AI
                      </span>
                    ) : (
                      msg.sender_name || "Admin"
                    )}
                  </span>
                )}
                <span className="block whitespace-pre-wrap">{msg.content}</span>
                <p className={`text-[10px] mt-1 ${
                  msg.sender_type === "visitor" ? "text-muted-foreground" : msg.is_ai_response ? "text-muted-foreground" : "text-primary-foreground/60"
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin reply input */}
      {selectedConv.status === "open" && (
        <>
          <Separator />
          <div className="p-3 shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a reply... (AI pauses when you respond)"
                disabled={sending}
                className="flex-1"
              />
              <Button size="icon" onClick={sendAdminReply} disabled={!input.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              AI resumes automatically after 7 seconds of inactivity
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
