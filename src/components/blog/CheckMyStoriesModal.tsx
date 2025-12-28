import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileSearch, CheckCircle, Clock, XCircle, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface Story {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  submitted_at: string;
  category: string;
}

export const CheckMyStoriesModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!referenceNumber.trim()) {
      setError("Please enter your Captain Reference Number");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStories(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("blog_posts")
        .select("id, slug, title, status, submitted_at, category")
        .eq("reference_number", referenceNumber.trim())
        .order("submitted_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError("No stories found with this reference number. Please check and try again.");
      } else {
        setStories(data);
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
      setError("An error occurred while fetching your stories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setReferenceNumber("");
    setStories(null);
    setError(null);
  };

  const stats = stories ? {
    total: stories.length,
    approved: stories.filter(s => s.status === "approved").length,
    pending: stories.filter(s => s.status === "pending").length,
    rejected: stories.filter(s => s.status === "rejected").length,
  } : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="gap-2">
          <FileSearch className="h-5 w-5" />
          Check My Stories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Check My Stories</DialogTitle>
          <DialogDescription>
            Enter your Captain Application Reference Number to view your submitted stories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Captain Reference Number</Label>
            <div className="flex gap-2">
              <Input
                id="referenceNumber"
                placeholder="e.g., CAP-2024-001"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          )}

          {stories && stories.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <Label>Your Stories</Label>
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {story.status === "approved" && story.slug ? (
                        <Link
                          to={`/blog/${story.slug}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {story.title}
                        </Link>
                      ) : (
                        <p className="font-medium line-clamp-1">{story.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(story.submitted_at).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {story.category}
                        </Badge>
                      </div>
                    </div>
                    {getStatusBadge(story.status)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {stories && stories.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No stories found with this reference number.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
