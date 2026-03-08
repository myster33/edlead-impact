import { useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PortalAbsenceRequest() {
  const { portalUser, currentSchool } = usePortalAuth();
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // This page requires a linked student. For now, show a placeholder.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalUser || !currentSchool) return;

    setIsSubmitting(true);
    // For MVP, parent needs a linked student. We'd need to select which child.
    toast({ title: "Coming soon", description: "Child selection will be available once student-parent links are configured." });
    setIsSubmitting(false);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Absence Request</h1>
          <p className="text-muted-foreground">Submit a reason for your child's absence</p>
        </div>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />New Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the reason for absence..." required />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
