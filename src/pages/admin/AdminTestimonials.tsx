import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Quote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  school: string;
  province: string;
  quote: string;
  is_published: boolean;
  created_at: string;
}

const emptyForm = { name: "", role: "", school: "", province: "", quote: "", is_published: false };

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase.from("testimonials").update({
          name: values.name, role: values.role, school: values.school,
          province: values.province, quote: values.quote, is_published: values.is_published,
        }).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert({
          name: values.name, role: values.role, school: values.school,
          province: values.province, quote: values.quote, is_published: values.is_published,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success(editingId ? "Testimonial updated" : "Testimonial added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("testimonials").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
  const openEdit = (t: Testimonial) => {
    setForm({ name: t.name, role: t.role, school: t.school, province: t.province, quote: t.quote, is_published: t.is_published });
    setEditingId(t.id);
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.name || !form.quote) { toast.error("Name and quote are required"); return; }
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Testimonials</h1>
            <p className="text-muted-foreground">Manage testimonials displayed on the Impact page</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add testimonial</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Quote className="h-5 w-5" />All testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : testimonials.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No testimonials yet. Click "Add testimonial" to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Role</TableHead>
                    <TableHead className="hidden md:table-cell">School</TableHead>
                    <TableHead className="hidden lg:table-cell">Province</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{t.role}</TableCell>
                      <TableCell className="hidden md:table-cell">{t.school}</TableCell>
                      <TableCell className="hidden lg:table-cell">{t.province}</TableCell>
                      <TableCell>
                        <Switch
                          checked={t.is_published}
                          onCheckedChange={(checked) => togglePublish.mutate({ id: t.id, published: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the testimonial from {t.name}.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit testimonial" : "Add testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Learner Leader" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School</Label>
                <Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quote *</Label>
              <Textarea rows={4} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(checked) => setForm({ ...form, is_published: checked })} />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Save changes" : "Add testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
