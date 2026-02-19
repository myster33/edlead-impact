import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OnlineAdmin {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  profile_picture_url?: string | null;
}

export function useOnlinePresence(currentAdmin: {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
} | null) {
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentAdmin?.id) return;

    const channel = supabase.channel("admin-presence", {
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
        setOnlineAdmins(admins);
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
    };
  }, [currentAdmin?.id]);

  return { onlineAdmins };
}
