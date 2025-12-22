import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  Loader2,
  ExternalLink,
  Star
} from "lucide-react";

const blogCategories = [
  "Leadership",
  "Impact Stories",
  "Personal Growth",
  "Academic Excellence",
  "Community Projects",
  "Tips & Advice",
];

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  author_name: string;
  author_school: string;
  author_province: string;
  author_email: string;
  status: string;
  submitted_at: string;
  approved_at: string | null;
  slug: string;
  category: string;
  is_featured: boolean;
}

const AdminBlogManagement = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch blog posts.",
        variant: "destructive",
      });
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin, statusFilter]);

  const handleApprove = async (post: BlogPost) => {
    setSaving(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .update({ 
        status: "approved", 
        approved_at: new Date().toISOString() 
      })
      .eq("id", post.id)
      .select("slug")
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve the post.",
        variant: "destructive",
      });
    } else {
      // Send approval notification to author (fire and forget)
      supabase.functions.invoke("notify-author-approval", {
        body: {
          author_email: post.author_email,
          author_name: post.author_name,
          title: post.title,
          slug: data?.slug || post.slug,
        },
      }).catch((err) => {
        console.error("Failed to send author notification:", err);
      });

      toast({
        title: "Post Approved",
        description: "The blog post has been published and the author has been notified.",
      });
      fetchPosts();
    }
    setSaving(false);
  };

  const handleReject = async (post: BlogPost) => {
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "rejected" })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject the post.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Rejected",
        description: "The blog post has been rejected.",
      });
      fetchPosts();
    }
    setSaving(false);
  };

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setEditForm({
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;

    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: editForm.title,
        summary: editForm.summary,
        content: editForm.content,
        category: editForm.category,
      })
      .eq("id", selectedPost.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update the post.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Updated",
        description: "The blog post has been updated successfully.",
      });
      setEditDialogOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", selectedPost.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete the post.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Deleted",
        description: "The blog post has been deleted.",
      });
      setDeleteDialogOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  const MAX_FEATURED_POSTS = 3;

  const handleToggleFeatured = async (post: BlogPost) => {
    // If trying to feature a post, check the limit
    if (!post.is_featured) {
      const featuredCount = posts.filter(p => p.is_featured).length;
      if (featuredCount >= MAX_FEATURED_POSTS) {
        toast({
          title: "Featured Limit Reached",
          description: `You can only feature up to ${MAX_FEATURED_POSTS} posts at a time. Remove one before adding another.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ is_featured: !post.is_featured })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update featured status.",
        variant: "destructive",
      });
    } else {
      toast({
        title: post.is_featured ? "Removed from Featured" : "Added to Featured",
        description: post.is_featured 
          ? "The post is no longer featured." 
          : "The post will now appear in the Featured section.",
      });
      fetchPosts();
    }
    setSaving(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <p className="text-muted-foreground">Review, edit, and approve leader stories</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Star className={`h-4 w-4 ${posts.filter(p => p.is_featured).length > 0 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">
                {posts.filter(p => p.is_featured).length}/{MAX_FEATURED_POSTS} Featured
              </span>
            </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No blog posts found.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {post.title}
                    </TableCell>
                    <TableCell>{post.author_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{post.category}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(post.status)}</TableCell>
                    <TableCell>
                      {post.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleFeatured(post)}
                          className={post.is_featured ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-foreground"}
                          title={post.is_featured ? "Remove from featured" : "Add to featured"}
                        >
                          <Star className={`h-4 w-4 ${post.is_featured ? "fill-current" : ""}`} />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(post.submitted_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPost(post);
                            setViewDialogOpen(true);
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(post)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {post.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(post)}
                              className="text-green-600 hover:text-green-700"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(post)}
                              className="text-destructive hover:text-destructive"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {post.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                            title="View Live"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPost(post);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
            <DialogDescription>
              By {selectedPost?.author_name} • {selectedPost?.author_school}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Author Email</Label>
              <p>{selectedPost?.author_email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Province</Label>
              <p>{selectedPost?.author_province}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Summary</Label>
              <p className="bg-muted p-3 rounded-md">{selectedPost?.summary}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Full Story</Label>
              <div className="bg-muted p-3 rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedPost?.content}
              </div>
            </div>
          </div>
          <DialogFooter>
            {selectedPost?.status === "pending" && (
              <>
                <Button variant="outline" onClick={() => handleReject(selectedPost)}>
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selectedPost)}>
                  Approve & Publish
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Make changes to the blog post before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select 
                value={editForm.category} 
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {blogCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-summary">Summary</Label>
              <Textarea
                id="edit-summary"
                rows={3}
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                rows={10}
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Blog Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPost?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlogManagement;
