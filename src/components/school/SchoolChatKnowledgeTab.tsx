import { useState, useEffect, useRef } from "react";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, BookOpen, Upload, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "General",
  "Policies",
  "Fees",
  "Calendar",
  "Curriculum",
  "Contact",
  "Admissions",
  "Extracurricular",
  "Custom",
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.txt";

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  content_type: string;
  document_url: string | null;
  document_name: string | null;
  document_size: number | null;
}

export default function SchoolChatKnowledgeTab() {
  const { schoolUser, currentSchool } = useSchoolAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [contentType, setContentType] = useState<"text" | "document">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isStaff = schoolUser?.role === "school_admin" || schoolUser?.role === "hr";

  const fetchArticles = async () => {
    if (!currentSchool) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("school_chat_knowledge")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("category")
      .order("created_at", { ascending: false });

    if (!error && data) setArticles(data as KnowledgeArticle[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, [currentSchool]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("General");
    setContentType("text");
    setSelectedFile(null);
    setEditingArticle(null);
  };

  const openEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setContentType((article.content_type as "text" | "document") || "text");
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only PDF, DOC, DOCX, and TXT files are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File too large", description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const uploadDocument = async (file: File): Promise<{ url: string; name: string; size: number } | null> => {
    if (!currentSchool) return null;
    const ext = file.name.split(".").pop();
    const path = `${currentSchool.id}/knowledge/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("school-assets")
      .upload(path, file, { contentType: file.type });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, size: file.size };
  };

  const handleSave = async () => {
    if (!currentSchool || !schoolUser || !title.trim()) return;

    if (contentType === "text" && !content.trim()) {
      toast({ title: "Content required", description: "Please enter text content.", variant: "destructive" });
      return;
    }
    if (contentType === "document" && !selectedFile && !editingArticle?.document_url) {
      toast({ title: "Document required", description: "Please attach a document.", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let documentUrl = editingArticle?.document_url || null;
      let documentName = editingArticle?.document_name || null;
      let documentSize = editingArticle?.document_size || null;

      if (contentType === "document" && selectedFile) {
        const result = await uploadDocument(selectedFile);
        if (!result) { setSaving(false); return; }
        documentUrl = result.url;
        documentName = result.name;
        documentSize = result.size;
      }

      const record: any = {
        title: title.trim(),
        category,
        content_type: contentType,
        content: contentType === "text" ? content.trim() : (content.trim() || `Document: ${documentName}`),
        document_url: contentType === "document" ? documentUrl : null,
        document_name: contentType === "document" ? documentName : null,
        document_size: contentType === "document" ? documentSize : null,
      };

      if (editingArticle) {
        const { error } = await supabase
          .from("school_chat_knowledge")
          .update(record)
          .eq("id", editingArticle.id);
        if (error) throw error;
        toast({ title: "Article updated" });
      } else {
        const { error } = await supabase
          .from("school_chat_knowledge")
          .insert({ ...record, school_id: currentSchool.id, created_by: schoolUser.id });
        if (error) throw error;
        toast({ title: "Article added" });
      }
      setDialogOpen(false);
      resetForm();
      fetchArticles();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (article: KnowledgeArticle) => {
    const { error } = await supabase
      .from("school_chat_knowledge")
      .update({ is_active: !article.is_active })
      .eq("id", article.id);
    if (!error) {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_active: !a.is_active } : a));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("school_chat_knowledge").delete().eq("id", id);
    if (!error) {
      setArticles(prev => prev.filter(a => a.id !== id));
      toast({ title: "Article deleted" });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isStaff) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only school admins can manage the chat knowledge base.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Chat Knowledge Base
            </CardTitle>
            <CardDescription>
              Add articles or documents to train your school's AI assistant. The chatbot will use this information to answer questions.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingArticle ? "Edit Article" : "Add Knowledge Article"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School Fees 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as "text" | "document")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Content</SelectItem>
                      <SelectItem value="document">Document Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contentType === "text" ? (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Write the information the AI should know about this topic..."
                      className="min-h-[160px]"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Document (PDF, DOC, DOCX, TXT — max {MAX_FILE_SIZE_MB}MB)</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_EXTENSIONS}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedFile(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : editingArticle?.document_url ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{editingArticle.document_name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(editingArticle.document_size)} — Current document</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Replace
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" /> Choose Document
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Notes (optional)</Label>
                      <Textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Optional notes about the document..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingArticle ? "Update Article" : "Add Article"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No knowledge articles yet.</p>
            <p className="text-sm">Add articles or upload documents about your school's policies, fees, calendar, and more to train the AI chatbot.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(article => (
              <div key={article.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm truncate">{article.title}</span>
                    <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                    {article.content_type === "document" && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" /> Document
                      </Badge>
                    )}
                    {!article.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                  </div>
                  {article.content_type === "document" && article.document_name ? (
                    <p className="text-xs text-muted-foreground">
                      {article.document_name} ({formatFileSize(article.document_size)})
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={article.is_active} onCheckedChange={() => toggleActive(article)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(article)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(article.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
