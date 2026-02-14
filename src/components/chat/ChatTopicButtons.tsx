import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Coins, MapPin, HelpCircle, FileText } from "lucide-react";

const TOPICS = [
  { label: "Admissions & Applications", icon: GraduationCap, value: "admissions" },
  { label: "Programme Information", icon: BookOpen, value: "programme" },
  { label: "Fees & Financial Aid", icon: Coins, value: "fees" },
  { label: "Contact & Location", icon: MapPin, value: "contact" },
  { label: "Other Question", icon: HelpCircle, value: "other" },
];

interface ChatTopicButtonsProps {
  onSelect: (topic: string) => void;
  onApply?: () => void;
  disabled?: boolean;
}

export function ChatTopicButtons({ onSelect, onApply, disabled }: ChatTopicButtonsProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground mb-3 text-center">Choose a topic or type your question below:</p>
      <div className="flex flex-col gap-2">
        {TOPICS.map((t) => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            className="justify-start gap-2 text-xs h-9"
            onClick={() => onSelect(t.value)}
            disabled={disabled}
          >
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            {t.label}
          </Button>
        ))}
        {onApply && (
          <Button
            variant="default"
            size="sm"
            className="justify-start gap-2 text-xs h-9 mt-1"
            onClick={onApply}
            disabled={disabled}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            📝 Apply Now (via Chat)
          </Button>
        )}
      </div>
    </div>
  );
}
