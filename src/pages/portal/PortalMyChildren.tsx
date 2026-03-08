import { useState, useEffect, useCallback } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Clock, CheckCircle, XCircle } from "lucide-react";

export default function PortalMyChildren() {
  const { portalUser, currentSchool } = usePortalAuth();
  const { toast } = useToast();
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [linkRequests, setLinkRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Request form
  const [requestOpen, setRequestOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [relationship, setRelationship] = useState("guardian");
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!portalUser?.id) return;

    // Fetch linked students
    const { data: links } = await supabase
      .from("student_parent_links")
      .select("*, school_users!student_parent_links_student_user_id_fkey(id, full_name, email, student_id_number)")
      .eq("parent_user_id", portalUser.id);
    setLinkedStudents(links || []);

    // Fetch pending link requests
    const { data: reqs } = await (supabase as any)
      .from("parent_link_requests")
      .select("*")
      .eq("parent_user_id", portalUser.id)
      .order("created_at", { ascending: false });
    setLinkRequests(reqs || []);
    setIsLoading(false);
  }, [portalUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmitRequest = async () => {
    if (!portalUser?.id || !currentSchool?.id || !studentName.trim()) {
      toast({ title: "Validation", description: "Student name is required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { error } = await (supabase as any).from("parent_link_requests").insert({
      school_id: currentSchool.id,
      parent_user_id: portalUser.id,
      student_name: studentName.trim(),
      student_id_number: studentIdNumber.trim() || null,
      relationship,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Request submitted", description: "Your school will review and approve the link." });
    setIsSaving(false);
    setRequestOpen(false);
    setStudentName(""); setStudentIdNumber(""); setRelationship("guardian");
    fetchData();
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-primary" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Children</h1>
            <p className="text-muted-foreground">View linked learners and request new links</p>
          </div>
          <Button onClick={() => setRequestOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Link a Child
          </Button>
        </div>

        {/* Linked Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Linked Learners</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : linkedStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No linked learners yet. Click "Link a Child" to submit a request.</p>
            ) : (
              <div className="space-y-2">
                {linkedStudents.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{link.school_users?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{link.school_users?.email}</p>
                      {link.school_users?.student_id_number && (
                        <p className="text-xs text-muted-foreground">ID: {link.school_users.student_id_number}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">{link.relationship}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link Requests */}
        {linkRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {linkRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(req.status)}
                      <div>
                        <p className="font-medium text-sm">{req.student_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{req.relationship} • {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Link a Child</DialogTitle>
            <DialogDescription>Submit a request to link your child. The school will review and match them to a registered student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Child's Full Name</Label>
              <Input placeholder="Full name as registered at school" value={studentName} onChange={e => setStudentName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Student ID Number (optional)</Label>
              <Input placeholder="Helps the school match your request" value={studentIdNumber} onChange={e => setStudentIdNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={isSaving}>{isSaving ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
