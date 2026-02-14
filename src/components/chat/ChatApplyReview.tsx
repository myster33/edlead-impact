import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Send, Loader2, Pencil, Check, X } from "lucide-react";

interface ChatApplyReviewProps {
  applicationData: Record<string, any>;
  onSubmit: () => void;
  onEdit: () => void;
  onFieldUpdate: (field: string, value: any) => void;
  isSubmitting: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  grade: "Grade",
  school_name: "School Name",
  school_address: "School Address",
  country: "Country",
  province: "Province",
  student_email: "Email",
  student_phone: "Phone Number",
  parent_name: "Parent/Guardian Name",
  parent_relationship: "Relationship",
  parent_email: "Parent Email",
  parent_phone: "Parent Phone",
  parent_consent: "Parent Consent",
  nominating_teacher: "Nominating Teacher",
  teacher_position: "Teacher Position",
  school_email: "School Email",
  school_contact: "School Contact",
  formally_nominated: "Formally Nominated",
  is_learner_leader: "Learner Leader",
  leader_roles: "Leadership Roles",
  school_activities: "School Activities",
  why_edlead: "Why edLEAD",
  leadership_meaning: "Leadership Meaning",
  school_challenge: "School Challenge",
  project_idea: "Project Idea",
  project_problem: "Problem Addressed",
  project_benefit: "Project Benefit",
  project_team: "Project Team",
  manage_schoolwork: "Managing Schoolwork",
  academic_importance: "Academic Importance",
  willing_to_commit: "Willing to Commit",
  has_device_access: "Device Access",
  learner_photo_url: "Passport Photo",
};

// Fields that use yes/no select
const BOOLEAN_FIELDS = new Set([
  "parent_consent", "formally_nominated", "is_learner_leader",
  "willing_to_commit", "has_device_access",
]);

// Fields that need a textarea (long text)
const LONG_TEXT_FIELDS = new Set([
  "school_activities", "why_edlead", "leadership_meaning", "school_challenge",
  "project_idea", "project_problem", "project_benefit", "project_team",
  "manage_schoolwork", "academic_importance", "leader_roles",
]);

// Fields that cannot be edited inline
const NON_EDITABLE = new Set(["learner_photo_url"]);

const SECTIONS: { title: string; fields: string[] }[] = [
  { title: "Personal Info", fields: ["full_name", "date_of_birth", "gender", "grade", "school_name", "school_address", "country", "province", "student_email", "student_phone"] },
  { title: "Parent/Guardian", fields: ["parent_name", "parent_relationship", "parent_email", "parent_phone", "parent_consent"] },
  { title: "Nomination", fields: ["nominating_teacher", "teacher_position", "school_email", "school_contact", "formally_nominated"] },
  { title: "Leadership & Activities", fields: ["is_learner_leader", "leader_roles", "school_activities"] },
  { title: "Motivation", fields: ["why_edlead", "leadership_meaning", "school_challenge"] },
  { title: "School Impact Project", fields: ["project_idea", "project_problem", "project_benefit", "project_team"] },
  { title: "Academic & Commitment", fields: ["manage_schoolwork", "academic_importance", "willing_to_commit", "has_device_access"] },
  { title: "Photo", fields: ["learner_photo_url"] },
];

function formatValue(key: string, value: any): string {
  if (value === undefined || value === null || value === "") return "—";
  if (key === "learner_photo_url") return "✅ Uploaded";
  if (value === "yes" || value === true) return "Yes";
  if (value === "no" || value === false) return "No";
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

  if (BOOLEAN_FIELDS.has(field)) {
    const current = draft === "yes" || draft === true ? "yes" : "no";
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Select value={current} onValueChange={(v) => { onSave(v); }}>
          <SelectTrigger className="h-6 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
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

export function ChatApplyReview({ applicationData, onSubmit, onEdit, onFieldUpdate, isSubmitting }: ChatApplyReviewProps) {
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
          Review Your Application
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/30 shrink-0 flex flex-col" style={{ maxHeight: "320px" }}>
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h4 className="text-xs font-semibold text-foreground">📋 Review Your Application</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(false)}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-3 pb-2">
          {SECTIONS.map((section) => {
            const hasData = section.fields.some((f) => applicationData[f] !== undefined && applicationData[f] !== null && applicationData[f] !== "");
            if (!hasData) return null;

            return (
              <div key={section.title}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
                <div className="space-y-0.5">
                  {section.fields.map((field) => {
                    const val = applicationData[field];
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
