import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, Banknote, CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const spotsLeft = event?.max_capacity ? event.max_capacity - event.current_bookings : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">This event may have been removed or doesn't exist.</p>
          <Button asChild>
            <Link to="/events">Back to Events</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{event.title} | edLEAD Events</title>
        <meta name="description" content={event.description?.slice(0, 160)} />
      </Helmet>

      {/* Banner */}
      {(event.image_url || event.banner_square_url) && (
        <>
          {event.image_url && (
            <div className="hidden md:block w-full max-h-[400px] overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="block md:hidden w-full aspect-square overflow-hidden">
            <img
              src={event.banner_square_url || event.image_url || ""}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        </>
      )}

      <div className="container py-8 md:py-12">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={event.category === "concurrent" ? "default" : "secondary"}>
                  {event.category === "concurrent" ? "On-going" : "Once-Off"}
                </Badge>
                {isFull && <Badge variant="destructive">Fully Booked</Badge>}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
            </div>

            <div className="prose prose-lg max-w-none text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </div>

            {/* Organiser */}
            {event.organiser_name && (
              <div className="border rounded-lg p-4 flex items-center gap-4">
                {event.organiser_logo_url && (
                  event.organiser_website ? (
                    <a href={event.organiser_website} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={event.organiser_logo_url} alt={event.organiser_name} className="h-14 w-14 rounded-lg object-contain border p-1" />
                    </a>
                  ) : (
                    <img src={event.organiser_logo_url} alt={event.organiser_name} className="h-14 w-14 rounded-lg object-contain border p-1" />
                  )
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Organised by</p>
                  <p className="font-semibold">{event.organiser_name}</p>
                  {event.organiser_website && (
                    <a href={event.organiser_website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                      Visit website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="border rounded-lg p-6 space-y-4 sticky top-24">
              {/* Date */}
              {event.event_date && (
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{format(new Date(event.event_date), "dd MMMM yyyy")}</p>
                    {format(new Date(event.event_date), "HH:mm") !== "00:00" && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), "HH:mm")}
                        {event.event_end_date && format(new Date(event.event_end_date), "HH:mm") !== "00:00" && ` – ${format(new Date(event.event_end_date), "HH:mm")}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!event.event_date && (
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-medium">Available anytime</p>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <p>{event.location}</p>
                </div>
              )}

              {/* Capacity */}
              {event.max_capacity && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <p>{spotsLeft} spots remaining</p>
                </div>
              )}

              {/* Price */}
              {event.price && Number(event.price) > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-xl font-bold">R {Number(event.price).toFixed(2)}</p>
                  </div>
                  {event.price_inclusions && event.price_inclusions.length > 0 && (
                    <div className="ml-8 space-y-1">
                      {event.price_inclusions.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xl font-bold text-primary">Free</p>
                </div>
              )}

              <Button asChild className="w-full mt-4" size="lg" disabled={isFull}>
                <Link to={`/events/${event.id}/book`}>
                  {isFull ? "Fully Booked" : "Book Now"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventDetail;
