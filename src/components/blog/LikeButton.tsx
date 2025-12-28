import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  blogPostId: string;
  className?: string;
}

// Generate a unique session ID for anonymous likes
const getSessionId = () => {
  let sessionId = localStorage.getItem("blog_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("blog_session_id", sessionId);
  }
  return sessionId;
};

export const LikeButton = ({ blogPostId, className }: LikeButtonProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = getSessionId();

  useEffect(() => {
    fetchLikeStatus();
  }, [blogPostId]);

  const fetchLikeStatus = async () => {
    // Get total likes count
    const { count } = await supabase
      .from("blog_likes")
      .select("*", { count: "exact", head: true })
      .eq("blog_post_id", blogPostId);

    setLikeCount(count || 0);

    // Check if current session has liked
    const { data } = await supabase
      .from("blog_likes")
      .select("id")
      .eq("blog_post_id", blogPostId)
      .eq("session_id", sessionId)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_post_id", blogPostId)
          .eq("session_id", sessionId);
        
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from("blog_likes")
          .insert({
            blog_post_id: blogPostId,
            session_id: sessionId,
          });
        
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1 h-8 px-2", className)}
      onClick={handleLike}
      disabled={isLoading}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          isLiked && "fill-red-500 text-red-500"
        )}
      />
      <span className="text-xs">{likeCount}</span>
    </Button>
  );
};
