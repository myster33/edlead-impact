import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatContactFormProps {
  visitorName?: string;
  visitorEmail?: string;
}

export function ChatContactForm({ visitorName = "", visitorEmail = "" }: ChatContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: visitorName,
    email: visitorEmail,
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact", {
        body: {
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("Contact form error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-3 my-2 p-3 rounded-lg bg-accent/50 border text-center space-y-1">
        <CheckCircle className="h-5 w-5 text-primary mx-auto" />
        <p className="text-xs font-medium text-foreground">Thank you! Our team will respond to you ASAP.</p>
        <p className="text-[11px] text-muted-foreground">You can also email us at info@edlead.co.za</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-3 my-2 p-3 rounded-lg bg-accent/30 border space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Mail className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Leave us your query</span>
      </div>
      <Input
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        className="h-8 text-xs"
        disabled={submitting}
      />
      <Input
        placeholder="Your email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
        className="h-8 text-xs"
        disabled={submitting}
      />
      <Input
        placeholder="Subject"
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        required
        className="h-8 text-xs"
        disabled={submitting}
      />
      <Textarea
        placeholder="Your message..."
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        required
        rows={2}
        className="text-xs min-h-[48px]"
        disabled={submitting}
      />
      <Button type="submit" size="sm" className="w-full h-7 text-xs" disabled={submitting}>
        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        {submitting ? "Sending..." : "Submit"}
      </Button>
    </form>
  );
}
