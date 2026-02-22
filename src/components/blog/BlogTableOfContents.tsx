import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  index: number;
}

interface BlogTableOfContentsProps {
  content: string;
  maxHeadingLength?: number;
}

const isLikelyHeading = (line: string, maxLen: number): boolean => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > maxLen || trimmed.length < 3) return false;
  // Exclude lines that end with common punctuation (sentences)
  if (/[.!?,;:]$/.test(trimmed)) return false;
  // Exclude lines that look like regular sentences (too many words)
  if (trimmed.split(/\s+/).length > 8) return false;
  return true;
};

export const BlogTableOfContents = ({ content, maxHeadingLength = 60 }: BlogTableOfContentsProps) => {
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => {
    const lines = content.split("\n");
    const items: TocItem[] = [];
    lines.forEach((line, index) => {
      if (isLikelyHeading(line, maxHeadingLength)) {
        items.push({
          id: `section-${index}`,
          text: line.trim(),
          index,
        });
      }
    });
    return items;
  }, [content, maxHeadingLength]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the topmost visible heading
          const sorted = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sorted[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="sticky top-16 space-y-1" aria-label="Table of contents">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
        <List className="h-4 w-4" />
        <span>Contents</span>
      </div>
      <ul className="space-y-1 border-l border-border pl-3">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => handleClick(h.id)}
              className={cn(
                "text-left text-sm py-1 px-2 rounded-sm w-full transition-colors line-clamp-2",
                activeId === h.id
                  ? "text-primary font-medium bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
