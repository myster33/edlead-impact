import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    banner_square_url?: string | null;
    location: string | null;
    event_date: string | null;
    event_end_date: string | null;
    category: string;
    max_capacity: number | null;
    current_bookings: number;
  };
}

export function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.max_capacity ? event.max_capacity - event.current_bookings : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
      {(event.image_url || event.banner_square_url) && (
        <>
          {/* Wide banner for md+ screens */}
          {event.image_url && (
            <div className="hidden md:block aspect-video overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}
          {/* Square banner for mobile, fallback to wide if no square */}
          <div className="block md:hidden aspect-square overflow-hidden">
            <img
              src={event.banner_square_url || event.image_url || ""}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        </>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={event.category === "concurrent" ? "default" : "secondary"}>
            {event.category === "concurrent" ? "On-going" : "Once-Off"}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          {event.event_date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{format(new Date(event.event_date), "dd MMM yyyy, HH:mm")}</span>
            </div>
          )}
          {!event.event_date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>Available anytime</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{event.location}</span>
            </div>
          )}
          {event.max_capacity && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{spotsLeft} spots remaining</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" disabled={isFull}>
          <Link to={`/events/${event.id}/book`}>
            {isFull ? "Fully Booked" : "Book Now"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
