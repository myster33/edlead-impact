import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { StorySubmissionForm } from "@/components/blog/StorySubmissionForm";
import { BlogCard } from "@/components/blog/BlogCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  author_name: string;
  author_school: string;
  author_province: string;
  approved_at: string;
  featured_image_url: string | null;
}

const Blog = () => {
  const { displayedText } = useTypingAnimation("edLEAD Voices", 50);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, summary, author_name, author_school, author_province, approved_at, featured_image_url")
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

      {/* Blog Posts */}
      <section className="py-20">
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
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">No Stories Yet</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Be the first to share your leadership journey! Submit your story and inspire future edLEAD Captains.
              </p>
              <StorySubmissionForm />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {posts.map((post) => (
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
                  featuredImageUrl={post.featured_image_url || undefined}
                />
              ))}
            </div>
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
