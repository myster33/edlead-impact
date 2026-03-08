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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Trash2, Loader2, Search, Users, GraduationCap, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRADES = [
  "Grade R", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

// CAPS subjects by phase
const CAPS_SUBJECTS: Record<string, string[]> = {
  "Grade R": ["Home Language", "First Additional Language", "Mathematics", "Life Skills"],
  "Grade 1": ["Home Language", "First Additional Language", "Mathematics", "Life Skills"],
  "Grade 2": ["Home Language", "First Additional Language", "Mathematics", "Life Skills"],
  "Grade 3": ["Home Language", "First Additional Language", "Mathematics", "Life Skills"],
  "Grade 4": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences and Technology", "Social Sciences", "Life Skills", "Creative Arts", "Technology"],
  "Grade 5": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences and Technology", "Social Sciences", "Life Skills", "Creative Arts", "Technology"],
  "Grade 6": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences and Technology", "Social Sciences", "Life Skills", "Creative Arts", "Technology"],
  "Grade 7": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences", "Social Sciences", "Life Orientation", "Economic and Management Sciences", "Technology", "Creative Arts"],
  "Grade 8": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences", "Social Sciences", "Life Orientation", "Economic and Management Sciences", "Technology", "Creative Arts"],
  "Grade 9": ["Home Language", "First Additional Language", "Mathematics", "Natural Sciences", "Social Sciences", "Life Orientation", "Economic and Management Sciences", "Technology", "Creative Arts"],
  "Grade 10": ["Home Language", "First Additional Language", "Mathematics", "Mathematical Literacy", "Life Orientation", "Physical Sciences", "Life Sciences", "Accounting", "Business Studies", "Economics", "Geography", "History", "Computer Applications Technology", "Information Technology", "Engineering Graphics and Design", "Agricultural Sciences", "Tourism", "Visual Arts", "Dramatic Arts", "Music", "Consumer Studies"],
  "Grade 11": ["Home Language", "First Additional Language", "Mathematics", "Mathematical Literacy", "Life Orientation", "Physical Sciences", "Life Sciences", "Accounting", "Business Studies", "Economics", "Geography", "History", "Computer Applications Technology", "Information Technology", "Engineering Graphics and Design", "Agricultural Sciences", "Tourism", "Visual Arts", "Dramatic Arts", "Music", "Consumer Studies"],
  "Grade 12": ["Home Language", "First Additional Language", "Mathematics", "Mathematical Literacy", "Life Orientation", "Physical Sciences", "Life Sciences", "Accounting", "Business Studies", "Economics", "Geography", "History", "Computer Applications Technology", "Information Technology", "Engineering Graphics and Design", "Agricultural Sciences", "Tourism", "Visual Arts", "Dramatic Arts", "Music", "Consumer Studies"],
};

export default function SchoolSubjects() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState<Record<string, number>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");
  const [editSubjectGrade, setEditSubjectGrade] = useState("");
  const [editSubjectCurriculum, setEditSubjectCurriculum] = useState("");

  const isStaff = schoolUser?.role === "school_admin" || schoolUser?.role === "hr";

  const fetchCurricula = useCallback(async () => {
    const { data } = await supabase.from("curricula").select("*").eq("is_active", true).order("name");
    setCurricula(data || []);
    if (data && data.length > 0 && !selectedCurriculum) {
      setSelectedCurriculum(data[0].id);
    }
  }, [selectedCurriculum]);

  const fetchSubjects = useCallback(async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);
    let query = supabase.from("subjects").select("*").eq("school_id", currentSchool.id).eq("is_active", true).order("grade").order("name");
    if (selectedCurriculum) query = query.eq("curriculum_id", selectedCurriculum);
    if (selectedGrade) query = query.eq("grade", selectedGrade);
    const { data } = await query;
    setSubjects(data || []);

    // Fetch enrollment counts
    if (data && data.length > 0) {
      const subjectIds = data.map((s: any) => s.id);
      const { data: enrollments } = await supabase
        .from("student_subjects")
        .select("subject_id")
        .in("subject_id", subjectIds);
      const counts: Record<string, number> = {};
      (enrollments || []).forEach((e: any) => {
        counts[e.subject_id] = (counts[e.subject_id] || 0) + 1;
      });
      setEnrolledStudents(counts);
    }

    setIsLoading(false);
  }, [currentSchool?.id, selectedCurriculum, selectedGrade]);

  useEffect(() => { fetchCurricula(); }, [fetchCurricula]);
  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !currentSchool?.id || !selectedCurriculum) return;
    setIsSaving(true);
    const { error } = await supabase.from("subjects").insert({
      school_id: currentSchool.id,
      name: newSubjectName.trim(),
      code: newSubjectCode.trim() || null,
      curriculum_id: selectedCurriculum,
      grade: selectedGrade || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subject added" });
      setNewSubjectName("");
      setNewSubjectCode("");
      setAddDialogOpen(false);
      fetchSubjects();
    }
    setIsSaving(false);
  };

  const handleBulkAddCAPS = async () => {
    if (!currentSchool?.id || !selectedGrade) return;
    const capsId = curricula.find(c => c.code === "CAPS")?.id;
    if (!capsId) { toast({ title: "CAPS curriculum not found", variant: "destructive" }); return; }

    const capsSubjects = CAPS_SUBJECTS[selectedGrade] || [];
    if (capsSubjects.length === 0) return;

    setIsSaving(true);
    // Get existing subject names for this grade/curriculum to avoid duplicates
    const { data: existing } = await supabase
      .from("subjects")
      .select("name")
      .eq("school_id", currentSchool.id)
      .eq("curriculum_id", capsId)
      .eq("grade", selectedGrade);
    const existingNames = new Set((existing || []).map((s: any) => s.name));

    const toInsert = capsSubjects
      .filter(name => !existingNames.has(name))
      .map(name => ({
        school_id: currentSchool.id!,
        name,
        curriculum_id: capsId,
        grade: selectedGrade,
      }));

    if (toInsert.length === 0) {
      toast({ title: "All CAPS subjects already exist for this grade" });
      setIsSaving(false);
      setBulkDialogOpen(false);
      return;
    }

    const { error } = await supabase.from("subjects").insert(toInsert);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${toInsert.length} CAPS subjects added for ${selectedGrade}` });
      setBulkDialogOpen(false);
      fetchSubjects();
    }
    setIsSaving(false);
  };

  const handleDeleteSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subject removed" });
      fetchSubjects();
    }
  };

  const filteredSubjects = subjects.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCurriculumName = curricula.find(c => c.id === selectedCurriculum)?.code || "";

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subjects</h1>
            <p className="text-muted-foreground">Manage subjects by curriculum and grade</p>
          </div>
          {isStaff && (
            <div className="flex gap-2">
              <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!selectedGrade}>
                    <GraduationCap className="mr-2 h-4 w-4" />Add CAPS Subjects
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add CAPS Subjects for {selectedGrade}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    This will add all standard CAPS subjects for {selectedGrade}. Existing subjects won't be duplicated.
                  </p>
                  <div className="text-sm space-y-1 max-h-48 overflow-y-auto">
                    {(CAPS_SUBJECTS[selectedGrade] || []).map(s => (
                      <Badge key={s} variant="outline" className="mr-1 mb-1">{s}</Badge>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleBulkAddCAPS} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add Subject</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Subject</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Curriculum</Label>
                      <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                        <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
                        <SelectContent>
                          {curricula.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {GRADES.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Name</Label>
                      <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Physical Sciences" />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Code (optional)</Label>
                      <Input value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value)} placeholder="e.g. PHY" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSubject} disabled={isSaving || !newSubjectName.trim()}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Subject
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Curriculum</Label>
                <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                  <SelectTrigger><SelectValue placeholder="All curricula" /></SelectTrigger>
                  <SelectContent>
                    {curricula.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Grade</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search subjects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No subjects found. {isStaff ? 'Use "Add CAPS Subjects" to quickly populate subjects for a grade.' : ""}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Curriculum</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />Enrolled
                      </div>
                    </TableHead>
                    {isStaff && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map(subject => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        {subject.code ? <Badge variant="outline">{subject.code}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{subject.grade || "—"}</TableCell>
                      <TableCell>
                        {curricula.find(c => c.id === subject.curriculum_id)?.code || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{enrolledStudents[subject.id] || 0}</Badge>
                      </TableCell>
                      {isStaff && (
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSubject(subject.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </SchoolLayout>
  );
}
