import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OnlineAdmin } from "./use-online-presence";

/**
 * Track which admins are currently viewing a specific application.
 * Uses Supabase Realtime presence on a per-application channel.
 */
export function useApplicationViewers(
  applicationId: string | null,
  currentAdmin: {
    id: string;
    email: string;
    role: string;
    full_name?: string | null;
    profile_picture_url?: string | null;
  } | null
) {
  const [viewers, setViewers] = useState<OnlineAdmin[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Clean up previous channel when applicationId changes
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!applicationId || !currentAdmin?.id) {
      setViewers([]);
      return;
    }

    const channelName = `app-viewers-${applicationId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentAdmin.id } },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<OnlineAdmin>();
        const admins: OnlineAdmin[] = [];
        for (const key in state) {
          const presences = state[key];
          if (presences.length > 0) {
            const p = presences[0];
            admins.push({
              id: p.id,
              full_name: p.full_name ?? null,
              email: p.email,
              role: p.role,
              profile_picture_url: p.profile_picture_url ?? null,
            });
          }
        }
        setViewers(admins);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: currentAdmin.id,
            email: currentAdmin.email,
            role: currentAdmin.role,
            full_name: currentAdmin.full_name ?? null,
            profile_picture_url: currentAdmin.profile_picture_url ?? null,
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [applicationId, currentAdmin?.id]);

  // Viewers excluding current user
  const otherViewers = viewers.filter((v) => v.id !== currentAdmin?.id);

  return { viewers, otherViewers };
}
