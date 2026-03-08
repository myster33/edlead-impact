import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentSubjectPickerProps {
  studentId: string;
  schoolId: string;
  studentGrade?: string;
  readOnly?: boolean;
}

export function StudentSubjectPicker({ studentId, schoolId, studentGrade, readOnly }: StudentSubjectPickerProps) {
  const { toast } = useToast();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [currRes, enrolledRes] = await Promise.all([
      supabase.from("curricula").select("*").eq("is_active", true).order("name"),
      supabase.from("student_subjects").select("subject_id").eq("student_id", studentId),
    ]);
    setCurricula(currRes.data || []);
    setEnrolledSubjectIds(new Set((enrolledRes.data || []).map((e: any) => e.subject_id)));
    if (currRes.data && currRes.data.length > 0 && !selectedCurriculum) {
      setSelectedCurriculum(currRes.data[0].id);
    }
    setIsLoading(false);
  }, [studentId, selectedCurriculum]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch subjects when curriculum changes
  useEffect(() => {
    if (!selectedCurriculum || !schoolId) return;
    const fetchSubjects = async () => {
      let query = supabase.from("subjects").select("*").eq("school_id", schoolId).eq("is_active", true).eq("curriculum_id", selectedCurriculum).order("name");
      if (studentGrade) query = query.eq("grade", studentGrade);
      const { data } = await query;
      setAvailableSubjects(data || []);
    };
    fetchSubjects();
  }, [selectedCurriculum, schoolId, studentGrade]);

  const handleToggleSubject = async (subjectId: string, checked: boolean) => {
    setIsSaving(true);
    if (checked) {
      const { error } = await supabase.from("student_subjects").insert({ student_id: studentId, subject_id: subjectId });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setEnrolledSubjectIds(prev => new Set([...prev, subjectId]));
      }
    } else {
      const { error } = await supabase.from("student_subjects").delete().eq("student_id", studentId).eq("subject_id", subjectId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setEnrolledSubjectIds(prev => {
          const next = new Set(prev);
          next.delete(subjectId);
          return next;
        });
      }
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />My Subjects
        </CardTitle>
        <CardDescription>
          {readOnly ? "Your enrolled subjects" : "Select the subjects you are taking"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Curriculum</Label>
          <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum} disabled={readOnly}>
            <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
            <SelectContent>
              {curricula.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No subjects available for this curriculum{studentGrade ? ` and ${studentGrade}` : ""}. Please ask your school admin to set up subjects.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableSubjects.map(subject => (
              <label
                key={subject.id}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  enrolledSubjectIds.has(subject.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                } ${readOnly ? "cursor-default" : ""}`}
              >
                <Checkbox
                  checked={enrolledSubjectIds.has(subject.id)}
                  onCheckedChange={(checked) => !readOnly && handleToggleSubject(subject.id, !!checked)}
                  disabled={readOnly || isSaving}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{subject.name}</p>
                  {subject.code && <p className="text-xs text-muted-foreground">{subject.code}</p>}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <Badge variant="secondary">{enrolledSubjectIds.size}</Badge>
          <span>subjects selected</span>
        </div>
      </CardContent>
    </Card>
  );
}
