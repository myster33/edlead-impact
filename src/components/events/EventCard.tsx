import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CalendarDays, MapPin, Users, Banknote, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { EventBookingDialog } from "@/components/events/EventBookingDialog";

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
    price?: number | null;
    price_inclusions?: string[] | null;
    organiser_name?: string | null;
    organiser_logo_url?: string | null;
    organiser_website?: string | null;
    short_code?: string | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const spotsLeft = event.max_capacity ? event.max_capacity - event.current_bookings : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const eventUrl = `/events/${event.short_code || event.id}`;

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
        {(event.image_url || event.banner_square_url) && (
          <>
            {event.image_url && (
              <div className="hidden md:block aspect-video overflow-hidden">
                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
              </div>
            )}
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
            <Button size="sm" disabled={isFull} onClick={() => setBookingOpen(true)}>
              {isFull ? "Fully Booked" : "Book Now"}
            </Button>
          </div>
          <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            {event.event_date && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>
                  {formatDateSAST(event.event_date, "dd MMM yyyy")}
                  {getTimeSAST(event.event_date) !== "00:00" && (
                    <>{`, ${getTimeSAST(event.event_date)}`}
                      {event.event_end_date && getTimeSAST(event.event_end_date) !== "00:00" && ` – ${getTimeSAST(event.event_end_date)}`}
                    </>
                  )}
                </span>
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
            {event.price && event.price > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">R {Number(event.price).toFixed(2)}</span>
                </div>
                {event.price_inclusions && event.price_inclusions.length > 0 && (
                  <div className="ml-6 space-y-0.5">
                    {event.price_inclusions.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">Free (By Booking)</span>
              </div>
            )}
          </div>
          {event.organiser_name && (
            <div className="flex items-center gap-2 pt-2 border-t mt-2">
              {event.organiser_logo_url && (
                event.organiser_website ? (
                  <a href={event.organiser_website} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={event.organiser_logo_url} alt={event.organiser_name} className="h-8 w-8 rounded object-contain border" />
                  </a>
                ) : (
                  <img src={event.organiser_logo_url} alt={event.organiser_name} className="h-8 w-8 rounded object-contain border" />
                )
              )}
              <span className="text-xs text-muted-foreground">
                Organised by <span className="font-medium text-foreground">{event.organiser_name}</span>
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link to={eventUrl}>View Details</Link>
          </Button>
        </CardFooter>
      </Card>

      <EventBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        event={{ id: event.id, title: event.title, current_bookings: event.current_bookings }}
      />
    </>
  );
}
