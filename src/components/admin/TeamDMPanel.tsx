import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle, Users, ArrowLeft } from "lucide-react";

interface DMMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DMThread {
  admin_id: string;
  admin_name: string;
  admin_email: string;
  admin_role: string;
  profile_picture_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

function getInitials(name: string) {
  return name
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
}

export function TeamDMPanel() {
  const { adminUser } = useAdminAuth();
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<DMThread | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playNotification } = useChatNotificationSound();

  const fetchThreads = useCallback(async () => {
    if (!adminUser?.id) return;

    // Get all DMs involving this admin
    const { data: allDMs } = await supabase
      .from("admin_direct_messages")
      .select("*")
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order("created_at", { ascending: false });

    if (!allDMs || allDMs.length === 0) {
      setThreads([]);
      return;
    }

    // Group by conversation partner
    const threadMap = new Map<string, { messages: DMMessage[] }>();
    for (const dm of allDMs) {
      const partnerId = dm.sender_id === adminUser.id ? dm.recipient_id : dm.sender_id;
      if (!threadMap.has(partnerId)) {
        threadMap.set(partnerId, { messages: [] });
      }
      threadMap.get(partnerId)!.messages.push(dm as DMMessage);
    }

    // Get admin info for partners
    const partnerIds = Array.from(threadMap.keys());
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id, full_name, email, role, profile_picture_url")
      .in("id", partnerIds);

    const adminMap = new Map(adminData?.map((a) => [a.id, a]) || []);

    const threadList: DMThread[] = partnerIds
      .map((partnerId) => {
        const admin = adminMap.get(partnerId);
        const msgs = threadMap.get(partnerId)!.messages;
        const lastMsg = msgs[0]; // Already sorted desc
        const unread = msgs.filter(
          (m) => m.recipient_id === adminUser.id && !m.is_read
        ).length;

        return {
          admin_id: partnerId,
          admin_name: admin?.full_name || "Unknown",
          admin_email: admin?.email || "",
          admin_role: admin?.role || "",
          profile_picture_url: admin?.profile_picture_url || null,
          last_message: lastMsg.content,
          last_message_at: lastMsg.created_at,
          unread_count: unread,
        };
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    setThreads(threadList);
  }, [adminUser?.id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Realtime
  useEffect(() => {
    if (!adminUser?.id) return;

    const channel = supabase
      .channel("team-dm-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_direct_messages" },
        (payload) => {
          const msg = payload.new as DMMessage;
          if (msg.sender_id === adminUser.id || msg.recipient_id === adminUser.id) {
            // Play sound for incoming messages from others
            if (msg.sender_id !== adminUser.id) {
              playNotification();
            }
            fetchThreads();
            if (selectedThread) {
              const partnerId = selectedThread.admin_id;
              if (msg.sender_id === partnerId || msg.recipient_id === partnerId) {
                setMessages((prev) => {
                  if (prev.find((m) => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
                if (msg.recipient_id === adminUser.id) {
                  supabase
                    .from("admin_direct_messages")
                    .update({ is_read: true })
                    .eq("id", msg.id)
                    .then();
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminUser?.id, selectedThread?.admin_id, fetchThreads]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const selectThread = async (thread: DMThread) => {
    setSelectedThread(thread);

    const { data } = await supabase
      .from("admin_direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${adminUser?.id},recipient_id.eq.${thread.admin_id}),and(sender_id.eq.${thread.admin_id},recipient_id.eq.${adminUser?.id})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as DMMessage[]);
      const unreadIds = data
        .filter((m) => m.recipient_id === adminUser?.id && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("admin_direct_messages")
          .update({ is_read: true })
          .in("id", unreadIds);
        fetchThreads();
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !adminUser?.id || !selectedThread || sending) return;
    setSending(true);

    await supabase.from("admin_direct_messages").insert({
      sender_id: adminUser.id,
      recipient_id: selectedThread.admin_id,
      content: newMessage.trim(),
    });

    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  if (selectedThread) {
    const displayName = selectedThread.admin_name || selectedThread.admin_email;
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              {selectedThread.profile_picture_url && (
                <AvatarImage src={selectedThread.profile_picture_url} alt={displayName} />
              )}
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{selectedThread.admin_role}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === adminUser?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    msg.sender_id === adminUser?.id
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <span className="block">{msg.content}</span>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.sender_id === adminUser?.id
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

        {/* Input */}
        <div className="p-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
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
      </div>
    );
  }

  // Thread list
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Team messages</span>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">{totalUnread}</Badge>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {threads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No team messages yet</p>
              <p className="text-[10px] mt-1">Tap an online admin to start chatting</p>
            </div>
          ) : (
            threads.map((thread) => {
              const displayName = thread.admin_name || thread.admin_email;
              return (
                <button
                  key={thread.admin_id}
                  onClick={() => selectThread(thread)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-2.5"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      {thread.profile_picture_url && (
                        <AvatarImage src={thread.profile_picture_url} alt={displayName} />
                      )}
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(thread.last_message_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                      {thread.unread_count > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-4 min-w-4 flex items-center justify-center shrink-0 ml-1">
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
