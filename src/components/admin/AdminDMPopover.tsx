import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { OnlineAdmin } from "@/hooks/use-online-presence";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";

interface DMMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface AdminDMPopoverProps {
  admin: OnlineAdmin;
  children: React.ReactNode;
}

function getInitials(name: string) {
  return name
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
}

export function AdminDMPopover({ admin, children }: AdminDMPopoverProps) {
  const { adminUser } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playNotification } = useChatNotificationSound();

  const fetchMessages = useCallback(async () => {
    if (!adminUser?.id || !admin.id) return;

    const { data } = await supabase
      .from("admin_direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${adminUser.id},recipient_id.eq.${admin.id}),and(sender_id.eq.${admin.id},recipient_id.eq.${adminUser.id})`
      )
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data as DMMessage[]);
      // Mark unread messages as read
      const unreadIds = data
        .filter((m) => m.recipient_id === adminUser.id && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("admin_direct_messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    }
  }, [adminUser?.id, admin.id]);

  useEffect(() => {
    if (open) fetchMessages();
  }, [open, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !adminUser?.id) return;

    const channel = supabase
      .channel(`dm-popover-${admin.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_direct_messages" },
        (payload) => {
          const msg = payload.new as DMMessage;
          if (
            (msg.sender_id === adminUser.id && msg.recipient_id === admin.id) ||
            (msg.sender_id === admin.id && msg.recipient_id === adminUser.id)
          ) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Play sound and mark as read if received
            if (msg.recipient_id === adminUser.id) {
              playNotification();
              supabase
                .from("admin_direct_messages")
                .update({ is_read: true })
                .eq("id", msg.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, adminUser?.id, admin.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !adminUser?.id || sending) return;
    setSending(true);

    await supabase.from("admin_direct_messages").insert({
      sender_id: adminUser.id,
      recipient_id: admin.id,
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

  const displayName = admin.full_name || admin.email;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0 flex flex-col"
        style={{ height: "24rem" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b">
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7">
              {admin.profile_picture_url && (
                <AvatarImage src={admin.profile_picture_url} alt={displayName} />
              )}
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
              style={{ backgroundColor: "hsl(142 71% 45%)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{admin.role}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Start a conversation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === adminUser?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs ${
                      msg.sender_id === adminUser?.id
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <span className="block">{msg.content}</span>
                    <p
                      className={`text-[9px] mt-0.5 ${
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
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-2 border-t">
          <div className="flex gap-1.5">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="h-8 w-8 p-0 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
