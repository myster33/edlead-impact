import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Pencil, Trash2, Users, UserPlus, UserMinus } from "lucide-react";

interface ClassRow {
  id: string;
  name: string;
  grade: string;
  academic_year: number;
  class_teacher_id: string | null;
  school_id: string;
  school_users: { full_name: string } | null;
}

export default function SchoolClasses() {
  const { currentSchool } = useSchoolAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassRow | null>(null);
  const [managingClass, setManagingClass] = useState<ClassRow | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formTeacherId, setFormTeacherId] = useState<string>("none");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [isSaving, setIsSaving] = useState(false);

  // Student assignment
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("classes")
      .select("*, school_users!classes_class_teacher_id_fkey(full_name)")
      .eq("school_id", currentSchool.id)
      .order("grade");
    setClasses((data as ClassRow[]) || []);
    setIsLoading(false);
  }, [currentSchool?.id]);

  const fetchTeachers = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("id, full_name, role")
      .eq("school_id", currentSchool.id)
      .in("role", ["educator", "class_teacher", "subject_teacher"])
      .eq("is_active", true)
      .order("full_name");
    setTeachers(data || []);
  }, [currentSchool?.id]);

  const fetchAllStudents = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("id, full_name, email")
      .eq("school_id", currentSchool.id)
      .eq("role", "student")
      .eq("is_active", true)
      .order("full_name");
    setStudents(data || []);
  }, [currentSchool?.id]);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchAllStudents();
  }, [fetchClasses, fetchTeachers, fetchAllStudents]);

  // Open create dialog
  const handleCreate = () => {
    setEditingClass(null);
    setFormName("");
    setFormGrade("");
    setFormTeacherId("none");
    setFormYear(new Date().getFullYear().toString());
    setFormOpen(true);
  };

  // Open edit dialog
  const handleEdit = (cls: ClassRow) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormGrade(cls.grade);
    setFormTeacherId(cls.class_teacher_id || "none");
    setFormYear(cls.academic_year.toString());
    setFormOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!currentSchool?.id || !formName.trim() || !formGrade.trim()) {
      toast({ title: "Validation", description: "Name and grade are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const payload = {
      name: formName.trim(),
      grade: formGrade.trim(),
      class_teacher_id: formTeacherId === "none" ? null : formTeacherId,
      academic_year: parseInt(formYear),
      school_id: currentSchool.id,
    };

    if (editingClass) {
      const { error } = await supabase.from("classes").update(payload).eq("id", editingClass.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Class updated" });
      }
    } else {
      const { error } = await supabase.from("classes").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Class created" });
      }
    }
    setIsSaving(false);
    setFormOpen(false);
    fetchClasses();
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingClass) return;
    // Delete class_students first, then class
    await supabase.from("class_students").delete().eq("class_id", deletingClass.id);
    const { error } = await supabase.from("classes").delete().eq("id", deletingClass.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Class deleted" });
    }
    setDeleteOpen(false);
    setDeletingClass(null);
    fetchClasses();
  };

  // Manage students
  const handleManageStudents = async (cls: ClassRow) => {
    setManagingClass(cls);
    setStudentsOpen(true);
    setLoadingStudents(true);
    const { data } = await supabase
      .from("class_students")
      .select("id, student_id, school_users!class_students_student_id_fkey(id, full_name, email)")
      .eq("class_id", cls.id);
    setClassStudents(data || []);
    setLoadingStudents(false);
  };

  const assignedStudentIds = classStudents.map((cs: any) => cs.student_id);
  const unassignedStudents = students.filter(s => !assignedStudentIds.includes(s.id));

  const handleAddStudent = async (studentId: string) => {
    if (!managingClass) return;
    const { error } = await supabase.from("class_students").insert({
      class_id: managingClass.id,
      student_id: studentId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      handleManageStudents(managingClass);
    }
  };

  const handleRemoveStudent = async (linkId: string) => {
    const { error } = await supabase.from("class_students").delete().eq("id", linkId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (managingClass) {
      handleManageStudents(managingClass);
    }
  };

  const grades = ["R", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground">Manage school classes, assign teachers and students</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Class
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              All Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : classes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No classes created yet. Click "Add Class" to get started.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map(cls => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.grade}</TableCell>
                      <TableCell>{cls.school_users?.full_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                      <TableCell>{cls.academic_year}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleManageStudents(cls)} title="Manage Students">
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cls)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setDeletingClass(cls); setDeleteOpen(true); }} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
            <DialogDescription>{editingClass ? "Update class details below." : "Fill in the details to create a new class."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name</Label>
              <Input id="className" placeholder="e.g. Grade 10A" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classGrade">Grade</Label>
              <Select value={formGrade} onValueChange={setFormGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classTeacher">Class Teacher</Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classYear">Academic Year</Label>
              <Input id="classYear" type="number" value={formYear} onChange={e => setFormYear(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : editingClass ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingClass?.name}</strong>? This will also remove all student assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={studentsOpen} onOpenChange={setStudentsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Students in {managingClass?.name}</DialogTitle>
            <DialogDescription>Add or remove students from this class.</DialogDescription>
          </DialogHeader>

          {loadingStudents ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Current students */}
              <div>
                <h3 className="text-sm font-medium mb-2">Assigned Students ({classStudents.length})</h3>
                {classStudents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No students assigned yet.</p>
                ) : (
                  <div className="space-y-1">
                    {classStudents.map((cs: any) => (
                      <div key={cs.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <span className="font-medium text-sm">{cs.school_users?.full_name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{cs.school_users?.email}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(cs.id)} title="Remove">
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available students */}
              <div>
                <h3 className="text-sm font-medium mb-2">Available Students ({unassignedStudents.length})</h3>
                {unassignedStudents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">All students are assigned.</p>
                ) : (
                  <div className="space-y-1">
                    {unassignedStudents.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <span className="font-medium text-sm">{s.full_name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{s.email}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleAddStudent(s.id)} title="Add">
                          <UserPlus className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}
