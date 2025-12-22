import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface BlogCardProps {
  id: string;
  slug: string;
  title: string;
  summary: string;
  authorName: string;
  authorSchool: string;
  authorProvince: string;
  approvedAt: string;
  category: string;
  featuredImageUrl?: string;
}

export const BlogCard = ({
  slug,
  title,
  summary,
  authorName,
  authorSchool,
  authorProvince,
  approvedAt,
  category,
  featuredImageUrl,
}: BlogCardProps) => {
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {featuredImageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={featuredImageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
            {category}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        {!featuredImageUrl && (
          <Badge variant="secondary" className="w-fit mb-2">
            {category}
          </Badge>
        )}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{authorName}</p>
            <p className="text-xs text-muted-foreground">{authorSchool}</p>
          </div>
        </div>
        <Link to={`/blog/${slug}`}>
          <h3 className="text-xl font-semibold leading-tight hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-muted-foreground text-sm line-clamp-3">{summary}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-0">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{authorProvince}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(approvedAt), "MMM d, yyyy")}</span>
          </div>
        </div>
        <Link to={`/blog/${slug}`} className="w-full">
          <Button variant="outline" className="w-full group/btn">
            Read More
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
