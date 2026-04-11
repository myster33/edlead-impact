import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { EventCard } from "@/components/events/EventCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

const Events = () => {
  const [filter, setFilter] = useState<"all" | "concurrent" | "once_off">("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "open")
        .order("event_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = events?.filter((e) => filter === "all" || e.category === filter) || [];

  return (
    <Layout>
      <Helmet>
        <title>Events | edLEAD</title>
        <meta name="description" content="Browse and book edLEAD events. Join our leadership programmes, workshops and community activities." />
      </Helmet>

      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">Events</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our upcoming events and book your spot. From leadership workshops to community gatherings.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="concurrent">Concurrent</TabsTrigger>
            <TabsTrigger value="once_off">Once-Off</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No events available at the moment.</p>
            <p className="text-sm mt-2">Check back soon for upcoming events!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Events;
