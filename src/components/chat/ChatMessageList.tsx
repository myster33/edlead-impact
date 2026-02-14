import { forwardRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";
import edleadIcon from "@/assets/edlead-icon.png";

const renderMessageContent = (content: string) => {
  // Parse markdown-style links [text](url) and **bold**
  const parts = content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} className="underline font-semibold hover:opacity-80" target={linkMatch[2].startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer">
          {linkMatch[1]}
        </a>
      );
    }
    const boldMatch = part.match(/\*\*(.*?)\*\*/);
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>;
    }
    return part;
  });
};

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
                    <img src={edleadIcon} alt="edLEAD" className="h-3 w-3 rounded-sm" /> edLEAD
                  </span>
                )}
                {msg.sender_name && !msg.is_ai_response && msg.sender_type === "admin" && (
                  <span className="block text-[10px] font-semibold mb-0.5">
                    {msg.sender_name}
                  </span>
                )}
                <span className="block">{renderMessageContent(msg.content)}</span>
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
                  {aiLoading && <img src={edleadIcon} alt="edLEAD" className="h-3 w-3 rounded-sm mr-1" />}
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
