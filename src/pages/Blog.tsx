import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { StorySubmissionForm, categories } from "@/components/blog/StorySubmissionForm";
import { BlogCard } from "@/components/blog/BlogCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, ChevronLeft, ChevronRight } from "lucide-react";

const POSTS_PER_PAGE = 9;

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  author_name: string;
  author_school: string;
  author_province: string;
  approved_at: string;
  category: string;
  featured_image_url: string | null;
}

const Blog = () => {
  const { displayedText } = useTypingAnimation("edLEAD Voices", 50);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, summary, author_name, author_school, author_province, approved_at, category, featured_image_url")
        .eq("status", "approved")
        .order("approved_at", { ascending: false });

      if (error) {
        console.error("Error fetching blog posts:", error);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed mb-8">
              Stories, reflections, and lessons from our edLEAD Captains' leadership journeys.
            </p>
            <StorySubmissionForm />
          </div>
        </div>
      </section>

      {/* Search and Category Filter */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search stories by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Stories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16">
        <div className="container">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">
                {selectedCategory === "all" ? "No Stories Yet" : `No ${selectedCategory} Stories Yet`}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {selectedCategory === "all" 
                  ? "Be the first to share your leadership journey! Submit your story and inspire future edLEAD Captains."
                  : `Be the first to share a story in the ${selectedCategory} category!`
                }
              </p>
              {selectedCategory !== "all" && (
                <Button variant="outline" onClick={() => setSelectedCategory("all")} className="mr-4">
                  View All Stories
                </Button>
              )}
              <StorySubmissionForm />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {paginatedPosts.map((post) => (
                  <BlogCard
                    key={post.id}
                    id={post.id}
                    slug={post.slug}
                    title={post.title}
                    summary={post.summary}
                    authorName={post.author_name}
                    authorSchool={post.author_school}
                    authorProvince={post.author_province}
                    approvedAt={post.approved_at}
                    category={post.category}
                    featuredImageUrl={post.featured_image_url || undefined}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* Results count */}
              <p className="text-center text-muted-foreground mt-8">
                Showing {startIndex + 1}-{Math.min(startIndex + POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} {filteredPosts.length === 1 ? "story" : "stories"}
                {selectedCategory !== "all" && ` in ${selectedCategory}`}
              </p>
            </>
          )}

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="bg-muted rounded-2xl p-8 md:p-12 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-foreground mb-4">Share Your Story</h3>
              <p className="text-muted-foreground mb-6">
                Are you an edLEAD Captain with a story to tell? We'd love to feature your journey on our blog.
              </p>
              <StorySubmissionForm />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
