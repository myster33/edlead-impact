import { useState, useEffect } from "react";
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
import { Loader2, Plus, Pencil, Trash2, Bot, BookOpen } from "lucide-react";
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

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export default function SchoolChatKnowledgeTab() {
  const { schoolUser, currentSchool } = useSchoolAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");

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
    setEditingArticle(null);
  };

  const openEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentSchool || !schoolUser || !title.trim() || !content.trim()) return;
    setSaving(true);

    try {
      if (editingArticle) {
        const { error } = await supabase
          .from("school_chat_knowledge")
          .update({ title: title.trim(), content: content.trim(), category })
          .eq("id", editingArticle.id);
        if (error) throw error;
        toast({ title: "Article updated" });
      } else {
        const { error } = await supabase
          .from("school_chat_knowledge")
          .insert({
            school_id: currentSchool.id,
            title: title.trim(),
            content: content.trim(),
            category,
            created_by: schoolUser.id,
          });
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

  if (!isStaff) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Only school admins can manage the AI chat knowledge base.
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
              <Bot className="h-5 w-5" /> AI Chat Knowledge Base
            </CardTitle>
            <CardDescription>
              Add articles to train your school's AI assistant. The chatbot will use this information to answer questions from students, parents, and visitors.
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
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write the information the AI should know about this topic..."
                    className="min-h-[160px]"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} className="w-full">
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
            <p className="text-sm">Add articles about your school's policies, fees, calendar, and more to train the AI chatbot.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(article => (
              <div key={article.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{article.title}</span>
                    <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                    {!article.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{article.content}</p>
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
