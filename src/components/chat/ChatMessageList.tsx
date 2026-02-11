import { forwardRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";

interface ChatMessageItem {
  id: string;
  content: string;
  sender_type: "visitor" | "admin";
  created_at: string;
  is_ai_response?: boolean;
  sender_name?: string;
}

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  adminTyping: boolean;
  aiLoading?: boolean;
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ messages, adminTyping, aiLoading }, ref) => {
    return (
      <ScrollArea className="flex-1 p-4" ref={ref}>
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
                {msg.is_ai_response && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-foreground bg-accent rounded px-1.5 py-0.5 mb-1">
                    <Bot className="h-2.5 w-2.5" /> edLEAD AI
                  </span>
                )}
                {msg.sender_name && !msg.is_ai_response && msg.sender_type === "admin" && (
                  <span className="block text-[10px] font-semibold mb-0.5">
                    {msg.sender_name}
                  </span>
                )}
                <span className="block">{msg.content}</span>
                <p className={`text-[10px] mt-1 ${msg.sender_type === "visitor" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {(adminTyping || aiLoading) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                <div className="flex gap-1 items-center">
                  {aiLoading && <Bot className="h-3 w-3 text-muted-foreground mr-1" />}
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";
