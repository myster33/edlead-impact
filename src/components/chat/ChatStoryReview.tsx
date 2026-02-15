import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Send, Loader2, Pencil, Check, X } from "lucide-react";

interface ChatStoryReviewProps {
  storyData: Record<string, any>;
  onSubmit: () => void;
  onEdit: () => void;
  onFieldUpdate: (field: string, value: any) => void;
  isSubmitting: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Story Title",
  category: "Category",
  reference_number: "Reference Number",
  author_name: "Author Name",
  author_school: "School",
  author_country: "Country",
  author_province: "Province",
  author_email: "Email",
  author_phone: "Phone",
  summary: "Summary",
  content: "Full Story",
  video_url: "Video Link",
  tags: "Tags",
  featured_image_url: "Featured Image",
};

const LONG_TEXT_FIELDS = new Set(["summary", "content"]);
const NON_EDITABLE = new Set(["featured_image_url"]);

const CATEGORIES = [
  "Leadership", "Community Service", "Innovation",
  "Academic Excellence", "Sports & Arts", "Personal Growth", "Mentorship",
];

const SECTIONS: { title: string; fields: string[] }[] = [
  { title: "Story Details", fields: ["title", "category", "reference_number"] },
  { title: "Author Info", fields: ["author_name", "author_school", "author_country", "author_province", "author_email", "author_phone"] },
  { title: "Story Content", fields: ["summary", "content"] },
  { title: "Media & Tags", fields: ["video_url", "tags", "featured_image_url"] },
];

function formatValue(key: string, value: any): string {
  if (value === undefined || value === null || value === "") return "—";
  if (key === "featured_image_url") return "✅ Uploaded";
  if (key === "content" && String(value).length > 200) return String(value).slice(0, 200) + "…";
  return String(value);
}

function InlineEditor({
  field,
  value,
  onSave,
  onCancel,
}: {
  field: string;
  value: any;
  onSave: (val: any) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  if (field === "category") {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Select value={draft} onValueChange={(v) => onSave(v)}>
          <SelectTrigger className="h-6 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (LONG_TEXT_FIELDS.has(field)) {
    return (
      <div className="mt-0.5 space-y-1">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="text-xs min-h-[60px] p-1.5"
          autoFocus
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSave(draft)}>
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-6 text-xs px-1.5 flex-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onSave(draft)}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onCancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ChatStoryReview({ storyData, onSubmit, onEdit, onFieldUpdate, isSubmitting }: ChatStoryReviewProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleSave = (field: string, value: any) => {
    onFieldUpdate(field, value);
    setEditingField(null);
  };

  if (!expanded) {
    return (
      <div className="px-3 py-2 border-t bg-muted/30 shrink-0">
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-7" onClick={() => setExpanded(true)}>
          <ChevronUp className="h-3 w-3" />
          Review Your Story
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/30 shrink-0 flex flex-col" style={{ maxHeight: "320px" }}>
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h4 className="text-xs font-semibold text-foreground">📝 Review Your Story</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(false)}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-3 pb-2">
          {SECTIONS.map((section) => {
            const hasData = section.fields.some((f) => storyData[f] !== undefined && storyData[f] !== null && storyData[f] !== "");
            if (!hasData) return null;

            return (
              <div key={section.title}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
                <div className="space-y-0.5">
                  {section.fields.map((field) => {
                    const val = storyData[field];
                    if (val === undefined || val === null || val === "") return null;
                    const formatted = formatValue(field, val);
                    const isLong = formatted.length > 60;
                    const isEditing = editingField === field;
                    const canEdit = !NON_EDITABLE.has(field);

                    return (
                      <div key={field} className="text-xs group">
                        <div className="flex items-start gap-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-muted-foreground">{FIELD_LABELS[field] || field}: </span>
                            {isEditing ? (
                              <InlineEditor
                                field={field}
                                value={val}
                                onSave={(v) => handleSave(field, v)}
                                onCancel={() => setEditingField(null)}
                              />
                            ) : (
                              <span className={`text-foreground ${isLong ? "block mt-0.5 text-[11px] leading-snug" : ""}`}>
                                {formatted}
                              </span>
                            )}
                          </div>
                          {canEdit && !isEditing && (
                            <button
                              onClick={() => setEditingField(field)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 p-0.5 rounded hover:bg-muted"
                              aria-label={`Edit ${FIELD_LABELS[field] || field}`}
                            >
                              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 px-3 py-2 border-t">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 flex-1" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Back to Chat
        </Button>
        <Button size="sm" className="gap-1.5 text-xs h-7 flex-1" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Confirm & Submit
        </Button>
      </div>
    </div>
  );
}
