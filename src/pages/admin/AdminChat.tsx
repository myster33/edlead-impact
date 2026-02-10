import { useState, useEffect, useRef, useCallback } from "react";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, MessageCircle, User, MapPin, Clock, X } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Conversation {
  id: string;
  session_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_country: string | null;
  visitor_province: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  assigned_to: string | null;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: "visitor" | "admin";
  sender_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function AdminChat() {
  const { adminUser } = useAdminAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playNotification } = useChatNotificationSound();

  const isRegionRestricted = adminUser?.role !== "admin" && (adminUser?.country || adminUser?.province);

  const fetchConversations = useCallback(async () => {
    let query = supabase
      .from("chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    // Region filtering for non-admin users
    if (isRegionRestricted) {
      if (adminUser?.country) {
        query = query.eq("visitor_country", adminUser.country);
      }
      if (adminUser?.province) {
        query = query.eq("visitor_province", adminUser.province);
      }
    }

    const { data } = await query;
    if (data) {
      // Get unread counts
      const convIds = data.map((c) => c.id);
      if (convIds.length > 0) {
        const { data: unreadData } = await supabase
          .from("chat_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("sender_type", "visitor")
          .eq("is_read", false);

        const unreadMap: Record<string, number> = {};
        unreadData?.forEach((m) => {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        });

        setConversations(
          data.map((c) => ({ ...c, unread_count: unreadMap[c.id] || 0 }))
        );
      } else {
        setConversations([]);
      }
    }
  }, [filter, isRegionRestricted, adminUser?.country, adminUser?.province]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime for new conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          // Update messages if viewing this conversation
          if (msg.conversation_id === selectedConv?.id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Mark as read
            if (msg.sender_type === "visitor") {
              supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", msg.id)
                .then();
            }
          } else if (msg.sender_type === "visitor") {
            // Play sound for messages not in the active conversation
            playNotification();
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv?.id, fetchConversations]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
      // Mark visitor messages as read
      const unreadIds = data
        .filter((m) => m.sender_type === "visitor" && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", unreadIds);
        fetchConversations();
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;
    setSending(true);

    await supabase.from("chat_messages").insert({
      conversation_id: selectedConv.id,
      sender_type: "admin",
      sender_id: adminUser?.id,
      content: newMessage.trim(),
      is_read: true,
    });

    await supabase
      .from("chat_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        assigned_to: adminUser?.id,
      })
      .eq("id", selectedConv.id);

    setNewMessage("");
    setSending(false);
  };

  const closeConversation = async (convId: string) => {
    await supabase
      .from("chat_conversations")
      .update({ status: "closed" })
      .eq("id", convId);

    if (selectedConv?.id === convId) {
      setSelectedConv(null);
      setMessages([]);
    }
    fetchConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <AdminLayout>
      <Helmet>
        <title>Live Chat | edLEAD Admin</title>
      </Helmet>

      {isRegionRestricted && (
        <Alert className="mb-4">
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            You are viewing chats from{" "}
            {adminUser?.province && adminUser?.country
              ? `${adminUser.province}, ${adminUser.country}`
              : adminUser?.province || adminUser?.country}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Conversation List */}
        <Card className="w-80 shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs">{totalUnread}</Badge>
              )}
            </CardTitle>
            <div className="flex gap-1 mt-2">
              {(["open", "closed", "all"] as const).map((f) => (
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
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedConv?.id === conv.id
                      ? "bg-accent border-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {conv.visitor_name || "Anonymous"}
                    </span>
                    {(conv.unread_count || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {conv.visitor_province && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {conv.visitor_province}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(conv.last_message_at || conv.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {selectedConv.visitor_name || "Anonymous"}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedConv.visitor_email && <span>{selectedConv.visitor_email}</span>}
                        {selectedConv.visitor_province && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {selectedConv.visitor_province}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedConv.status === "open" ? "default" : "secondary"}>
                      {selectedConv.status}
                    </Badge>
                    {selectedConv.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeConversation(selectedConv.id)}
                      >
                        <X className="h-3 w-3 mr-1" /> Close
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          msg.sender_type === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_type === "admin"
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedConv.status === "open" && (
                <div className="p-3 border-t shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start replying</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
