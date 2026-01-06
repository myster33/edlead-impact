import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAuditLog } from "@/hooks/use-audit-log";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  Loader2,
  ExternalLink,
  Star,
  Upload,
  Image as ImageIcon,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  ArchiveRestore,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Check if admin user has region restrictions
const getAdminRegionInfo = (adminUser: any) => {
  if (!adminUser || adminUser.role === "admin") {
    return { hasRestrictions: false, country: null, province: null, role: adminUser?.role || null, canEdit: true };
  }
  return {
    hasRestrictions: !!(adminUser.country || adminUser.province),
    country: adminUser.country || null,
    province: adminUser.province || null,
    role: adminUser.role,
    canEdit: adminUser.role === "reviewer", // Only reviewers can edit/approve, viewers can only view
  };
};

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
  author_country: string;
  author_province: string;
  author_email: string;
  status: string;
  submitted_at: string;
  approved_at: string | null;
  slug: string;
  category: string;
  is_featured: boolean;
  featured_image_url: string | null;
  video_url: string | null;
}

const AdminBlogManagement = () => {
  const { adminUser, isAdmin, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const { logAction } = useAuditLog();
  
  // Additional filters
  const [referenceFilter, setReferenceFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Region info for filtering
  const regionInfo = getAdminRegionInfo(adminUser);
  
  // Activity stats
  const [activityStats, setActivityStats] = useState({
    approved: 0,
    rejected: 0,
    pending: 0,
    archived: 0,
  });

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [showRemoveImageConfirm, setShowRemoveImageConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "",
    author_name: "",
    author_school: "",
    author_country: "",
    author_province: "",
    author_email: "",
    video_url: "",
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
    
    // Apply additional filters
    if (referenceFilter.trim()) {
      query = query.ilike("reference_number", `%${referenceFilter.trim()}%`);
    }
    
    if (nameFilter.trim()) {
      query = query.ilike("author_name", `%${nameFilter.trim()}%`);
    }
    
    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }
    
    if (countryFilter !== "all" && !regionInfo.hasRestrictions) {
      query = query.eq("author_country", countryFilter);
    }
    
    if (provinceFilter !== "all" && !regionInfo.hasRestrictions) {
      query = query.eq("author_province", provinceFilter);
    }
    
    if (dateFilter) {
      const filterDate = parseISO(dateFilter);
      query = query.gte("submitted_at", startOfDay(filterDate).toISOString())
                   .lte("submitted_at", endOfDay(filterDate).toISOString());
    }
    
    // Apply region filter for non-admin users
    if (regionInfo.hasRestrictions) {
      if (regionInfo.country) {
        query = query.eq("author_country", regionInfo.country);
      }
      if (regionInfo.province) {
        query = query.eq("author_province", regionInfo.province);
      }
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
      
      // Calculate activity stats for posts in user's region
      const postsData = data || [];
      setActivityStats({
        approved: postsData.filter(p => p.status === "approved").length,
        rejected: postsData.filter(p => p.status === "rejected").length,
        pending: postsData.filter(p => p.status === "pending").length,
        archived: postsData.filter(p => p.status === "archived").length,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin, statusFilter, referenceFilter, nameFilter, dateFilter, categoryFilter, countryFilter, provinceFilter, adminUser]);

  // Get unique countries and provinces for filter dropdowns
  const uniqueCountries = [...new Set(posts.map(p => p.author_country).filter(Boolean))];
  const uniqueProvinces = [...new Set(posts.map(p => p.author_province).filter(Boolean))];

  const clearAllFilters = () => {
    setReferenceFilter("");
    setNameFilter("");
    setDateFilter("");
    setCategoryFilter("all");
    setCountryFilter("all");
    setProvinceFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = referenceFilter || nameFilter || dateFilter || categoryFilter !== "all" || countryFilter !== "all" || provinceFilter !== "all" || statusFilter !== "all";

  const openApproveDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedPost) return;
    
    setSaving(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .update({ 
        status: "approved", 
        approved_at: new Date().toISOString() 
      })
      .eq("id", selectedPost.id)
      .select("slug")
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve the post.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Send approval notification to author
    const { error: notifyError } = await supabase.functions.invoke("notify-author-approval", {
      body: {
        author_email: selectedPost.author_email,
        author_name: selectedPost.author_name,
        title: selectedPost.title,
        slug: data?.slug || selectedPost.slug,
      },
    });

    if (notifyError) {
      console.error("Failed to send author notification:", notifyError);
      toast({
        title: "Post Approved",
        description: "The post was approved, but we couldn't send the notification email. The author may need to be contacted manually.",
      });
    } else {
      toast({
        title: "Post Approved",
        description: "The blog post has been published and the author has been notified via email.",
      });
    }

    // Log the approval action
    await logAction({
      action: "blog_approved",
      table_name: "blog_posts",
      record_id: selectedPost.id,
      new_values: { status: "approved", title: selectedPost.title },
    });

    setApproveDialogOpen(false);
    fetchPosts();
    setSaving(false);
  };

  const openRejectDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setRejectionFeedback("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPost) return;
    
    if (!rejectionFeedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback for the author.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "rejected" })
      .eq("id", selectedPost.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject the post.",
        variant: "destructive",
      });
    } else {
      // Send rejection notification to author (fire and forget)
      supabase.functions.invoke("notify-author-rejection", {
        body: {
          author_email: selectedPost.author_email,
          author_name: selectedPost.author_name,
          title: selectedPost.title,
          feedback: rejectionFeedback,
        },
      }).catch((err) => {
        console.error("Failed to send rejection notification:", err);
      });

      toast({
        title: "Post Rejected",
        description: "The blog post has been rejected and the author has been notified.",
      });

      // Log the rejection action
      await logAction({
        action: "blog_rejected",
        table_name: "blog_posts",
        record_id: selectedPost.id,
        new_values: { status: "rejected", title: selectedPost.title, feedback: rejectionFeedback },
      });

      setRejectDialogOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.).",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeNewImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Image upload failed",
        description: "There was an error uploading the image.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setEditForm({
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
      author_name: post.author_name,
      author_school: post.author_school,
      author_country: post.author_country || "South Africa",
      author_province: post.author_province,
      author_email: post.author_email,
      video_url: post.video_url || "",
    });
    // Reset image state
    setSelectedImage(null);
    setImagePreview(null);
    setRemoveExistingImage(false);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;

    setSaving(true);
    
    let newImageUrl: string | null = selectedPost.featured_image_url;
    
    // Handle image removal
    if (removeExistingImage && !selectedImage) {
      newImageUrl = null;
    }
    
    // Upload new image if selected
    if (selectedImage) {
      const uploadedUrl = await uploadImage(selectedImage);
      if (uploadedUrl) {
        newImageUrl = uploadedUrl;
      }
    }

    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: editForm.title,
        summary: editForm.summary,
        content: editForm.content,
        category: editForm.category,
        author_name: editForm.author_name,
        author_school: editForm.author_school,
        author_country: editForm.author_country,
        author_province: editForm.author_province,
        author_email: editForm.author_email,
        video_url: editForm.video_url || null,
        featured_image_url: newImageUrl,
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
      removeNewImage();
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
      // Log the deletion
      await logAction({
        action: "blog_deleted",
        table_name: "blog_posts",
        record_id: selectedPost.id,
        old_values: { title: selectedPost.title, author_name: selectedPost.author_name },
      });

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

      // Log the featured toggle action
      await logAction({
        action: "blog_featured",
        table_name: "blog_posts",
        record_id: post.id,
        new_values: { is_featured: !post.is_featured, title: post.title },
      });

      fetchPosts();
    }
    setSaving(false);
  };

  const openArchiveDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setArchiveDialogOpen(true);
  };

  const openRestoreDialog = (post: BlogPost) => {
    setSelectedPost(post);
    setRestoreDialogOpen(true);
  };

  const handleArchive = async () => {
    if (!selectedPost) return;
    
    setSaving(true);
    const { error, data } = await supabase
      .from("blog_posts")
      .update({ status: "archived" })
      .eq("id", selectedPost.id)
      .select();

    console.log("Archive result:", { data, error, postId: selectedPost.id });

    if (error) {
      console.error("Archive error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive the post.",
        variant: "destructive",
      });
    } else if (!data || data.length === 0) {
      // No rows updated - likely RLS issue
      console.error("No rows updated - possible RLS issue");
      toast({
        title: "Error",
        description: "Unable to archive the post. You may not have permission.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Archived",
        description: "The blog post has been archived and is no longer visible to the public.",
      });

      await logAction({
        action: "blog_archived",
        table_name: "blog_posts",
        record_id: selectedPost.id,
        new_values: { status: "archived", title: selectedPost.title },
      });

      setArchiveDialogOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  const handleRestore = async () => {
    if (!selectedPost) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "approved" })
      .eq("id", selectedPost.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to restore the post.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post Restored",
        description: "The blog post has been restored and is now visible to the public.",
      });

      await logAction({
        action: "blog_restored",
        table_name: "blog_posts",
        record_id: selectedPost.id,
        new_values: { status: "approved", title: selectedPost.title },
      });

      setRestoreDialogOpen(false);
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
      case "archived":
        return <Badge variant="outline" className="bg-muted">Archived</Badge>;
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
    <AdminLayout>
      <div className="space-y-8">
        {/* Region Assignment Banner for Restricted Users */}
        {regionInfo.hasRestrictions && (
          <Alert className="border-primary/20 bg-primary/5">
            <MapPin className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span className="font-medium">Your assigned region:</span>
              {regionInfo.province && (
                <Badge variant="secondary">{regionInfo.province}</Badge>
              )}
              {regionInfo.country && (
                <Badge variant="outline">{regionInfo.country}</Badge>
              )}
              <span className="text-muted-foreground text-sm ml-2">
                {regionInfo.canEdit 
                  ? "You can view, edit, and approve stories from this region."
                  : "You can only view stories from this region (read-only access)."}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Activity Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Stories</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                {activityStats.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {activityStats.approved}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                {activityStats.rejected}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <p className="text-muted-foreground">
              Review, edit, and approve leader stories
              {regionInfo.hasRestrictions && regionInfo.province && (
                <span className="ml-1">from {regionInfo.province}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Star className={`h-4 w-4 ${posts.filter(p => p.is_featured).length > 0 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">
                {posts.filter(p => p.is_featured).length}/{MAX_FEATURED_POSTS} Featured
              </span>
            </div>

            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Collapsible Filters Section */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filter Stories
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Reference Number */}
                <div className="space-y-2">
                  <Label htmlFor="referenceFilter" className="text-sm font-medium">Reference No.</Label>
                  <Input
                    id="referenceFilter"
                    placeholder="Search by reference..."
                    value={referenceFilter}
                    onChange={(e) => setReferenceFilter(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Author Name */}
                <div className="space-y-2">
                  <Label htmlFor="nameFilter" className="text-sm font-medium">Author Name</Label>
                  <Input
                    id="nameFilter"
                    placeholder="Search by name..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="dateFilter" className="text-sm font-medium">Submitted Date</Label>
                  <div className="relative">
                    <Input
                      id="dateFilter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {blogCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country - only for non-restricted users */}
                {!regionInfo.hasRestrictions && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Country</Label>
                    <Select value={countryFilter} onValueChange={(value) => {
                      setCountryFilter(value);
                      setProvinceFilter("all"); // Reset province when country changes
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        <SelectItem value="Algeria">Algeria</SelectItem>
                        <SelectItem value="Angola">Angola</SelectItem>
                        <SelectItem value="Benin">Benin</SelectItem>
                        <SelectItem value="Botswana">Botswana</SelectItem>
                        <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                        <SelectItem value="Burundi">Burundi</SelectItem>
                        <SelectItem value="Cabo Verde">Cabo Verde</SelectItem>
                        <SelectItem value="Cameroon">Cameroon</SelectItem>
                        <SelectItem value="Central African Republic">Central African Republic</SelectItem>
                        <SelectItem value="Chad">Chad</SelectItem>
                        <SelectItem value="Comoros">Comoros</SelectItem>
                        <SelectItem value="Democratic Republic of the Congo">Democratic Republic of the Congo</SelectItem>
                        <SelectItem value="Republic of the Congo">Republic of the Congo</SelectItem>
                        <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                        <SelectItem value="Djibouti">Djibouti</SelectItem>
                        <SelectItem value="Egypt">Egypt</SelectItem>
                        <SelectItem value="Equatorial Guinea">Equatorial Guinea</SelectItem>
                        <SelectItem value="Eritrea">Eritrea</SelectItem>
                        <SelectItem value="Eswatini">Eswatini</SelectItem>
                        <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                        <SelectItem value="Gabon">Gabon</SelectItem>
                        <SelectItem value="Gambia">Gambia</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                        <SelectItem value="Guinea">Guinea</SelectItem>
                        <SelectItem value="Guinea-Bissau">Guinea-Bissau</SelectItem>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Lesotho">Lesotho</SelectItem>
                        <SelectItem value="Liberia">Liberia</SelectItem>
                        <SelectItem value="Libya">Libya</SelectItem>
                        <SelectItem value="Madagascar">Madagascar</SelectItem>
                        <SelectItem value="Malawi">Malawi</SelectItem>
                        <SelectItem value="Mali">Mali</SelectItem>
                        <SelectItem value="Mauritania">Mauritania</SelectItem>
                        <SelectItem value="Mauritius">Mauritius</SelectItem>
                        <SelectItem value="Morocco">Morocco</SelectItem>
                        <SelectItem value="Mozambique">Mozambique</SelectItem>
                        <SelectItem value="Namibia">Namibia</SelectItem>
                        <SelectItem value="Niger">Niger</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                        <SelectItem value="São Tomé and Príncipe">São Tomé and Príncipe</SelectItem>
                        <SelectItem value="Senegal">Senegal</SelectItem>
                        <SelectItem value="Seychelles">Seychelles</SelectItem>
                        <SelectItem value="Sierra Leone">Sierra Leone</SelectItem>
                        <SelectItem value="Somalia">Somalia</SelectItem>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="South Sudan">South Sudan</SelectItem>
                        <SelectItem value="Sudan">Sudan</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                        <SelectItem value="Togo">Togo</SelectItem>
                        <SelectItem value="Tunisia">Tunisia</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Zambia">Zambia</SelectItem>
                        <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Province/Region - only for non-restricted users */}
                {!regionInfo.hasRestrictions && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Province/Region</Label>
                    <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Provinces/Regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Provinces/Regions</SelectItem>
                        {countryFilter === "South Africa" ? (
                          <>
                            <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                            <SelectItem value="Free State">Free State</SelectItem>
                            <SelectItem value="Gauteng">Gauteng</SelectItem>
                            <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                            <SelectItem value="Limpopo">Limpopo</SelectItem>
                            <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                            <SelectItem value="North West">North West</SelectItem>
                            <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                            <SelectItem value="Western Cape">Western Cape</SelectItem>
                          </>
                        ) : countryFilter !== "all" ? (
                          <>
                            <SelectItem value="Eastern">Eastern</SelectItem>
                            <SelectItem value="Western">Western</SelectItem>
                            <SelectItem value="Northern">Northern</SelectItem>
                            <SelectItem value="Southern">Southern</SelectItem>
                            <SelectItem value="Central">Central</SelectItem>
                          </>
                        ) : (
                          uniqueProvinces.map((prov) => (
                            <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Posts</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="archived">Archived ({activityStats.archived})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {referenceFilter && (
                    <Badge variant="secondary" className="gap-1">
                      Ref: {referenceFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setReferenceFilter("")} />
                    </Badge>
                  )}
                  {nameFilter && (
                    <Badge variant="secondary" className="gap-1">
                      Name: {nameFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setNameFilter("")} />
                    </Badge>
                  )}
                  {dateFilter && (
                    <Badge variant="secondary" className="gap-1">
                      Date: {dateFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFilter("")} />
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Category: {categoryFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                    </Badge>
                  )}
                  {countryFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Country: {countryFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setCountryFilter("all")} />
                    </Badge>
                  )}
                  {provinceFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Province: {provinceFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setProvinceFilter("all")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {statusFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                        {/* Edit - only for reviewers and admins */}
                        {regionInfo.canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(post)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Approve/Reject - only for pending posts and reviewers/admins */}
                        {post.status === "pending" && regionInfo.canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openApproveDialog(post)}
                              className="text-green-600 hover:text-green-700"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRejectDialog(post)}
                              className="text-destructive hover:text-destructive"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {post.status === "approved" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                              title="View Live"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {/* Archive - only for reviewers/admins */}
                            {regionInfo.canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openArchiveDialog(post)}
                                className="text-amber-600 hover:text-amber-700"
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        {/* Restore - only for archived posts and reviewers/admins */}
                        {post.status === "archived" && regionInfo.canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRestoreDialog(post)}
                            className="text-green-600 hover:text-green-700"
                            title="Restore"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Delete - only for admins */}
                        {adminUser?.role === "admin" && (
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
                        )}
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
            {/* Featured Image */}
            {selectedPost?.featured_image_url && (
              <div>
                <Label className="text-muted-foreground">Featured Image</Label>
                <img 
                  src={selectedPost.featured_image_url} 
                  alt="Featured" 
                  className="w-full max-h-48 object-cover rounded-md mt-2"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Author Name</Label>
                <p>{selectedPost?.author_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Author Email</Label>
                <p>{selectedPost?.author_email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">School</Label>
                <p>{selectedPost?.author_school}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Province</Label>
                <p>{selectedPost?.author_province}</p>
              </div>
            </div>
            {/* Video Link */}
            {selectedPost?.video_url && (
              <div>
                <Label className="text-muted-foreground">Video Link</Label>
                <a 
                  href={selectedPost.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {selectedPost.video_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
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
                <Button variant="outline" onClick={() => {
                  setViewDialogOpen(false);
                  openRejectDialog(selectedPost);
                }}>
                  Reject
                </Button>
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  openApproveDialog(selectedPost);
                }}>
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
            {/* Featured Image Section */}
            <div className="space-y-2">
              <Label>Featured Image</Label>
              {/* Current or new image preview */}
              {!removeExistingImage && (imagePreview || selectedPost?.featured_image_url) && (
                <div className="relative">
                  <img 
                    src={imagePreview || selectedPost?.featured_image_url || ""} 
                    alt="Featured" 
                    className="w-full max-h-40 object-cover rounded-md"
                  />
                  {imagePreview && (
                    <Badge className="absolute top-2 left-2 bg-primary">New Image</Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      if (imagePreview) {
                        removeNewImage();
                      } else {
                        setShowRemoveImageConfirm(true);
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {/* Removed image notice */}
              {removeExistingImage && !imagePreview && (
                <div className="bg-muted/50 border border-dashed rounded-md p-4 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Image will be removed</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setRemoveExistingImage(false)}
                    className="text-primary"
                  >
                    Undo
                  </Button>
                </div>
              )}
              {/* Upload button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedPost?.featured_image_url && !removeExistingImage ? "Replace Image" : "Upload Image"}
                </Button>
                {!imagePreview && !selectedPost?.featured_image_url && !removeExistingImage && (
                  <span className="text-sm text-muted-foreground">No image uploaded</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleImageSelect(e);
                  setRemoveExistingImage(false);
                }}
              />
            </div>
            
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

            {/* Author Details Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Author Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-author-name">Author Name</Label>
                  <Input
                    id="edit-author-name"
                    value={editForm.author_name}
                    onChange={(e) => setEditForm({ ...editForm, author_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-author-email">Author Email</Label>
                  <Input
                    id="edit-author-email"
                    type="email"
                    value={editForm.author_email}
                    onChange={(e) => setEditForm({ ...editForm, author_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-author-school">School</Label>
                  <Input
                    id="edit-author-school"
                    value={editForm.author_school}
                    onChange={(e) => setEditForm({ ...editForm, author_school: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-author-country">Country</Label>
                  <Input
                    id="edit-author-country"
                    value={editForm.author_country}
                    onChange={(e) => setEditForm({ ...editForm, author_country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-author-province">Province</Label>
                  <Input
                    id="edit-author-province"
                    value={editForm.author_province}
                    onChange={(e) => setEditForm({ ...editForm, author_province: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Video Link */}
            <div className="space-y-2">
              <Label htmlFor="edit-video-url">Video Link (Optional)</Label>
              <Input
                id="edit-video-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={editForm.video_url}
                onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
              />
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
            <Button variant="outline" onClick={() => { removeNewImage(); setRemoveExistingImage(false); setEditDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || isUploadingImage}>
              {(saving || isUploadingImage) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUploadingImage ? "Uploading Image..." : "Save Changes"}
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

      {/* Rejection Feedback Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Blog Post</DialogTitle>
            <DialogDescription>
              Please provide feedback for the author explaining why their story "{selectedPost?.title}" was not approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-feedback">Feedback for Author *</Label>
              <Textarea
                id="rejection-feedback"
                placeholder="Explain what changes or improvements are needed..."
                rows={5}
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This feedback will be sent to the author via email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={saving || !rejectionFeedback.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject & Notify Author
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve & Publish Story?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve <strong>"{selectedPost?.title}"</strong> by {selectedPost?.author_name}?
              <br /><br />
              This will publish the story on the blog and send an email notification to the author at <strong>{selectedPost?.author_email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={saving}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Approve & Notify Author
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archive Story?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>"{selectedPost?.title}"</strong>?
              <br /><br />
              The story will be hidden from the public blog but can be restored at any time. The author will not be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Archive Story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArchiveRestore className="h-5 w-5 text-green-600" />
              Restore Story?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore <strong>"{selectedPost?.title}"</strong>?
              <br /><br />
              The story will be published again and visible on the public blog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={saving}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Restore Story
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Image Confirmation Dialog */}
      <AlertDialog open={showRemoveImageConfirm} onOpenChange={setShowRemoveImageConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Featured Image?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the featured image from this post? This action will be applied when you save the changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setRemoveExistingImage(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminBlogManagement;
