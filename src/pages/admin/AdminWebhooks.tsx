import { useState, useEffect } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Webhook, RefreshCw, Zap, Copy } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

const AVAILABLE_EVENTS = [
  { value: "application.created", label: "Application Created" },
  { value: "application.status_changed", label: "Application Status Changed" },
  { value: "blog.submitted", label: "Blog Story Submitted" },
  { value: "blog.approved", label: "Blog Story Approved" },
];

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

const AdminWebhooks = () => {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState("");

  const fetchWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error:", error);
    setWebhooks((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const openNew = () => {
    setFormUrl("");
    setFormEvents([]);
    setFormSecret(generateSecret());
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formUrl || formEvents.length === 0) {
      toast({ title: "Error", description: "URL and at least one event are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("webhooks").insert({
      url: formUrl,
      events: formEvents,
      secret: formSecret,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Webhook created" });
      setDialogOpen(false);
      fetchWebhooks();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("webhooks").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchWebhooks();
    toast({ title: "Webhook deleted" });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("webhooks").update({ is_active: !current } as any).eq("id", id);
    fetchWebhooks();
  };

  const testWebhook = async (webhook: WebhookEntry) => {
    setTesting(webhook.id);
    try {
      const { data, error } = await supabase.functions.invoke("fire-webhook", {
        body: {
          event: "webhook.test",
          payload: { message: "Test webhook from edLEAD", timestamp: new Date().toISOString() },
        },
      });
      if (error) throw error;
      toast({ title: "Test sent", description: `Delivered to ${webhook.url}` });
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    }
    setTesting(null);
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast({ title: "Secret copied to clipboard" });
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground">Notify external systems when events occur</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : webhooks.length === 0 ? (
              <AdminEmptyState
                icon={Webhook}
                title="No webhooks configured"
                description="Add a webhook to receive notifications when events occur."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{wh.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map((e) => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={wh.is_active}
                          onCheckedChange={() => toggleActive(wh.id, wh.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        {wh.failure_count > 0 ? (
                          <Badge variant="destructive">{wh.failure_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {wh.last_triggered_at
                          ? format(new Date(wh.last_triggered_at), "dd MMM HH:mm")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => copySecret(wh.secret)} title="Copy secret">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => testWebhook(wh)} disabled={testing === wh.id}>
                          {testing === wh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(wh.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Webhook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>Configure an endpoint to receive event notifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Endpoint URL</Label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://example.com/webhook" />
            </div>
            <div>
              <Label>Events</Label>
              <div className="space-y-2 mt-2">
                {AVAILABLE_EVENTS.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={formEvents.includes(ev.value)}
                      onCheckedChange={(checked) => {
                        setFormEvents(checked
                          ? [...formEvents, ev.value]
                          : formEvents.filter((e) => e !== ev.value)
                        );
                      }}
                    />
                    <span className="text-sm">{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Signing Secret</Label>
              <div className="flex gap-2">
                <Input value={formSecret} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copySecret(formSecret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use this secret to verify webhook signatures (HMAC-SHA256).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>This webhook will stop receiving event notifications.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminWebhooks;
