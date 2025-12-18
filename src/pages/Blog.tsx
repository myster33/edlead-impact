import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const blogPosts = [
  {
    id: 1,
    title: "What Leadership Means to Me as a Student",
    excerpt: "Leadership isn't about being in charge—it's about taking care of those in your charge. Here's what I've learned as an edLEAD Captain.",
    author: "Thando M.",
    date: "December 10, 2024",
    category: "Personal Growth",
  },
  {
    id: 2,
    title: "How Our School Safety Project Changed Our Culture",
    excerpt: "When we started our safety initiative, we didn't expect it to transform our entire school community. This is our story.",
    author: "Sipho K.",
    date: "November 28, 2024",
    category: "Impact Stories",
  },
  {
    id: 3,
    title: "Lessons I Learned from Leading My First Team",
    excerpt: "Managing a team of peers isn't easy. Here are the five most valuable lessons I've learned along the way.",
    author: "Naledi P.",
    date: "November 15, 2024",
    category: "Leadership Tips",
  },
  {
    id: 4,
    title: "Balancing Academics and Leadership",
    excerpt: "Yes, you can be a student leader AND maintain good grades. Here's how I manage my time and priorities.",
    author: "Kamogelo D.",
    date: "October 30, 2024",
    category: "Academic Excellence",
  },
];

const Blog = () => {
  const { displayedText } = useTypingAnimation("edLEAD Voices", 50);
  
  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed">
              Stories, reflections, and lessons from our edLEAD Captains' leadership journeys.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full mb-4">
                    {post.category}
                  </span>
                  <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="bg-muted rounded-2xl p-8 md:p-12 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-foreground mb-4">Share Your Story</h3>
              <p className="text-muted-foreground mb-6">
                Are you an edLEAD Captain with a story to tell? We'd love to feature your journey on our blog.
              </p>
              <Link to="/contact">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Submit Your Story
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
