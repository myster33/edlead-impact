import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Trash2, Loader2, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function SchoolTimetable() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formDay, setFormDay] = useState("1");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("08:45");
  const [formPeriodLabel, setFormPeriodLabel] = useState("");

  // Subject management
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  const isStaffRole = schoolUser?.role === "school_admin" || schoolUser?.role === "hr";
  const isTeacherRole = ["class_teacher", "subject_teacher", "educator"].includes(schoolUser?.role || "");

  const fetchData = useCallback(async () => {
    if (!currentSchool?.id || !schoolUser?.id) return;
    setIsLoading(true);

    const [subjectsRes, classesRes, entriesRes] = await Promise.all([
      supabase.from("subjects").select("*, curricula(code)").eq("school_id", currentSchool.id).eq("is_active", true).order("name"),
      supabase.from("classes").select("id, name, grade").eq("school_id", currentSchool.id).order("grade"),
      supabase.from("timetable_entries")
        .select("*, subjects(name, code), classes(name, grade)")
        .eq("school_id", currentSchool.id)
        .eq("teacher_id", schoolUser.id)
        .order("day_of_week")
        .order("start_time"),
    ]);

    setSubjects(subjectsRes.data || []);
    setClasses(classesRes.data || []);
    setEntries(entriesRes.data || []);
    setIsLoading(false);
  }, [currentSchool?.id, schoolUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !currentSchool?.id) return;
    setAddingSubject(true);
    const { error } = await supabase.from("subjects").insert({
      school_id: currentSchool.id,
      name: newSubjectName.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewSubjectName("");
      toast({ title: "Subject added" });
      fetchData();
    }
    setAddingSubject(false);
  };

  const handleAddEntry = async () => {
    if (!formSubjectId || !formClassId || !currentSchool?.id || !schoolUser?.id) return;
    setIsSaving(true);
    const { error } = await supabase.from("timetable_entries").insert({
      school_id: currentSchool.id,
      teacher_id: schoolUser.id,
      subject_id: formSubjectId,
      class_id: formClassId,
      day_of_week: parseInt(formDay),
      start_time: formStartTime,
      end_time: formEndTime,
      period_label: formPeriodLabel || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Timetable entry added" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setIsSaving(false);
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry removed" });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormSubjectId("");
    setFormClassId("");
    setFormDay("1");
    setFormStartTime("08:00");
    setFormEndTime("08:45");
    setFormPeriodLabel("");
  };

  const groupedByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    entries: entries.filter(e => e.day_of_week === day.value),
  }));

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
            <p className="text-muted-foreground">Manage your weekly teaching schedule</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timetable Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Inline add subject */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="New subject name..."
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleAddSubject} disabled={addingSubject || !newSubjectName.trim()}>
                      {addingSubject ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={formClassId} onValueChange={setFormClassId}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={formDay} onValueChange={setFormDay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Period Label (optional)</Label>
                  <Input
                    placeholder="e.g. Period 1, Break..."
                    value={formPeriodLabel}
                    onChange={e => setFormPeriodLabel(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddEntry} disabled={isSaving || !formSubjectId || !formClassId}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No timetable entries yet. Click "Add Period" to create your teaching schedule.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedByDay.filter(d => d.entries.length > 0).map(day => (
              <Card key={day.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {day.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {day.entries.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {entry.period_label ? (
                              <Badge variant="outline">{entry.period_label}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                          </TableCell>
                          <TableCell className="font-medium">{entry.subjects?.name || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {entry.classes?.name} ({entry.classes?.grade})
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
