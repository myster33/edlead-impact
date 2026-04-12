import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { EventBookingDialog } from "@/components/events/EventBookingDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CalendarDays, MapPin, Users, Banknote, CheckCircle, ArrowLeft, ExternalLink, Loader2, Car } from "lucide-react";
import { formatDateSAST, getTimeSAST } from "@/lib/date-utils";
import { Helmet } from "react-helmet-async";

interface EventPartner {
  id: string;
  role: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  sort_order: number;
}

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: async () => {
      // Try short_code first, then UUID
      const isUuid = eventId!.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
      const query = isUuid
        ? supabase.from("events").select("*").eq("id", eventId!).single()
        : (supabase.from("events") as any).select("*").eq("short_code", eventId!).single();
      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
    enabled: !!eventId,
  });

  const { data: partners } = useQuery({
    queryKey: ["event-partners", event?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_partners")
        .select("*")
        .eq("event_id", event!.id)
        .order("sort_order");
      if (error) throw error;
      return data as EventPartner[];
    },
    enabled: !!event?.id,
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
          <Button asChild><Link to="/events">Back to Events</Link></Button>
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

      <div className="container py-8 md:py-12">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>

        {/* Mobile: stack vertically */}
        <div className="block md:hidden space-y-6">
          {/* Square banner */}
          {(event.banner_square_url || event.image_url) && (
            <div
              className="aspect-square rounded-lg overflow-hidden cursor-pointer"
              onClick={() => event.image_url && setBannerOpen(true)}
            >
              <img
                src={event.banner_square_url || event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={event.category === "concurrent" ? "default" : "secondary"}>
                {event.category === "concurrent" ? "On-going" : "Once-Off"}
              </Badge>
              <Button size="sm" disabled={isFull} onClick={() => setBookingOpen(true)}>
                {isFull ? "Fully Booked" : "Book Now"}
              </Button>
            </div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="prose max-w-none text-muted-foreground whitespace-pre-wrap text-sm">
              {event.description}
            </div>
            <EventPartners partners={partners} event={event} />
          </div>

          {/* Book section */}
          <EventSidebar event={event} isFull={isFull} spotsLeft={spotsLeft} onBook={() => setBookingOpen(true)} />
        </div>

        {/* Desktop/Tablet: two columns */}
        <div className="hidden md:grid grid-cols-5 gap-8">
          {/* Left: square banner + book section */}
          <div className="col-span-2 space-y-4">
            {(event.banner_square_url || event.image_url) && (
              <div
                className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => event.image_url && setBannerOpen(true)}
              >
                <img
                  src={event.banner_square_url || event.image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <EventSidebar event={event} isFull={isFull} spotsLeft={spotsLeft} onBook={() => setBookingOpen(true)} />
          </div>

          {/* Right: title, description, organiser */}
          <div className="col-span-3 space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant={event.category === "concurrent" ? "default" : "secondary"}>
                {event.category === "concurrent" ? "On-going" : "Once-Off"}
              </Badge>
              <Button size="sm" disabled={isFull} onClick={() => setBookingOpen(true)}>
                {isFull ? "Fully Booked" : "Book Now"}
              </Button>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold">{event.title}</h1>
            <div className="prose prose-lg max-w-none text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </div>
            <EventPartners partners={partners} event={event} />
          </div>
        </div>
      </div>

      {/* Full 16:9 banner popup */}
      <Dialog open={bannerOpen} onOpenChange={setBannerOpen}>
        <DialogContent className="max-w-4xl p-1">
          {event.image_url && (
            <img src={event.image_url} alt={event.title} className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Booking dialog */}
      <EventBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        event={{ id: event.id, title: event.title, current_bookings: event.current_bookings }}
      />
    </Layout>
  );
};

function EventSidebar({ event, isFull, spotsLeft, onBook }: { event: any; isFull: boolean; spotsLeft: number | null; onBook: () => void }) {
  return (
    <div className="border rounded-lg p-5 space-y-3">
      {event.event_date && (
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-medium">{formatDateSAST(event.event_date, "dd MMMM yyyy")}</p>
            {getTimeSAST(event.event_date) !== "00:00" && (
              <p className="text-sm text-muted-foreground">
                {getTimeSAST(event.event_date)}
                {event.event_end_date && getTimeSAST(event.event_end_date) !== "00:00" && ` – ${getTimeSAST(event.event_end_date)}`}
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
      {event.location && (
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <p>{event.location}</p>
        </div>
      )}
      {event.max_capacity && (
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <p>{spotsLeft} spots remaining</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Car className="h-5 w-5 text-primary shrink-0" />
        <p>{event.parking_available ? "Parking Available" : "No Parking"}</p>
      </div>
      {event.price && Number(event.price) > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xl font-bold">R {Number(event.price).toFixed(2)}</p>
          </div>
          {event.price_inclusions?.length > 0 && (
            <div className="ml-8 space-y-0.5">
              {event.price_inclusions.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xl font-bold text-primary">Free (By Booking)</p>
        </div>
      )}
      <Button className="w-full mt-2" size="lg" disabled={isFull} onClick={onBook}>
        {isFull ? "Fully Booked" : "Book Now"}
      </Button>
    </div>
  );
}

function EventPartners({ partners, event }: { partners: EventPartner[] | undefined; event: any }) {
  // Use partners from event_partners table, fallback to legacy columns
  const displayPartners: { role: string; name: string; website: string | null; logo_url: string | null }[] = [];

  if (partners && partners.length > 0) {
    displayPartners.push(...partners);
  } else {
    if (event.organiser_name) {
      displayPartners.push({ role: "Organised by", name: event.organiser_name, website: event.organiser_website, logo_url: event.organiser_logo_url });
    }
    if (event.organiser2_name) {
      displayPartners.push({ role: "Co-organised by", name: event.organiser2_name, website: event.organiser2_website, logo_url: event.organiser2_logo_url });
    }
  }

  if (displayPartners.length === 0) return null;

  return (
    <div className="space-y-3">
      {displayPartners.map((p, idx) => (
        <div key={idx} className="border rounded-lg p-4 flex items-center gap-4">
          {p.logo_url && (
            p.website ? (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={p.logo_url} alt={p.name} className="h-14 w-14 rounded-lg object-contain border p-1" />
              </a>
            ) : (
              <img src={p.logo_url} alt={p.name} className="h-14 w-14 rounded-lg object-contain border p-1" />
            )
          )}
          <div>
            <p className="text-sm text-muted-foreground">{p.role}</p>
            <p className="font-semibold">{p.name}</p>
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                Visit website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EventDetail;
