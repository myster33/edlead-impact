import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, ArrowLeft, Loader2, Clock, School, Bot, User } from "lucide-react";
import edleadIcon from "@/assets/edlead-icon.png";

interface SchoolConversation {
  id: string;
  school_id: string;
  visitor_name: string | null;
  visitor_role: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  ai_paused: boolean;
  school_name?: string;
}

interface SchoolMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  is_ai_response: boolean;
  created_at: string;
  sender_name: string | null;
}

const roleEmoji: Record<string, string> = {
  student: "🎓",
  parent: "👨‍👩‍👧",
  educator: "📚",
  guest: "👋",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function AdminSchoolChatsPanel() {
  const { adminUser } = useAdminAuth();
  const [conversations, setConversations] = useState<SchoolConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<SchoolConversation | null>(null);
  const [messages, setMessages] = useState<SchoolMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = adminUser?.role === "super_admin";

  const fetchConversations = useCallback(async () => {
    if (!isSuperAdmin) return;

    let query = (supabase as any)
      .from("school_chat_conversations")
      .select("*, schools:school_id(name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    if (data) {
      setConversations(
        data.map((c: any) => ({
          ...c,
          school_name: c.schools?.name || "Unknown School",
        }))
      );
    }
    setLoading(false);
  }, [isSuperAdmin, filter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime
  useEffect(() => {
    if (!isSuperAdmin) return;
    const channel = supabase
      .channel("admin-school-chat-convos")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "school_chat_conversations",
      }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin, fetchConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from("school_chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv, loadMessages]);

  // Realtime messages
  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel("admin-school-msgs-" + selectedConv.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "school_chat_messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload: any) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as SchoolMessage];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isSuperAdmin) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <School className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Only super admins can view school chats.</p>
        </div>
      </Card>
    );
  }

  if (selectedConv) {
    return (
      <Card className="flex flex-col h-full">
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
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">AI Paused</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <School className="h-3 w-3" /> {selectedConv.school_name}
              </p>
            </div>
            <Badge variant={selectedConv.status === "open" ? "default" : "outline"} className="text-xs">
              {selectedConv.status}
            </Badge>
          </div>
        </CardHeader>
        <Separator />

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No messages yet.</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_type === "visitor" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.sender_type === "visitor"
                    ? "bg-muted text-foreground rounded-bl-sm"
                    : msg.is_ai_response
                    ? "bg-primary/10 text-foreground rounded-br-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm"
                }`}>
                  {msg.sender_type === "assistant" && (
                    <span className="block text-[10px] font-semibold mb-0.5">
                      {msg.is_ai_response ? (
                        <span className="inline-flex items-center gap-1">
                          <img src={edleadIcon} alt="" className="h-3 w-3 rounded-sm" /> edLEAD AI
                        </span>
                      ) : (msg.sender_name || "Admin")}
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
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <School className="h-4 w-4" /> School edLEAD Chats
        </CardTitle>
        <div className="flex gap-1 mt-2">
          {(["open", "closed", "all"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No school chat conversations found.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
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
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">AI Paused</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <School className="h-3 w-3" /> {conv.school_name}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
