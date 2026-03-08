import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface PortalUser {
  id: string;
  user_id: string;
  school_id: string | null;
  role: "educator" | "class_teacher" | "subject_teacher" | "parent" | "student";
  full_name: string;
  email: string;
  phone?: string | null;
  profile_picture_url?: string | null;
  student_id_number?: string | null;
  user_code?: string | null;
  id_passport_number?: string | null;
  is_active: boolean;
}

interface PortalSchool {
  id: string;
  name: string;
  school_code: string;
  logo_url?: string | null;
}

interface PortalAuthContextType {
  user: User | null;
  session: Session | null;
  portalUser: PortalUser | null;
  allPortalUsers: PortalUser[];
  currentSchool: PortalSchool | null;
  availableSchools: PortalSchool[];
  isLoading: boolean;
  isAuthenticated: boolean;
  switchSchool: (schoolId: string) => void;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [allPortalUsers, setAllPortalUsers] = useState<PortalUser[]>([]);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [currentSchool, setCurrentSchool] = useState<PortalSchool | null>(null);
  const [availableSchools, setAvailableSchools] = useState<PortalSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPortalUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("school_users")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("role", ["educator", "class_teacher", "subject_teacher", "parent", "student"]);

      if (error || !data || data.length === 0) {
        setPortalUser(null);
        setAllPortalUsers([]);
        setIsLoading(false);
        return;
      }

      const portalUsers = data as PortalUser[];
      setAllPortalUsers(portalUsers);
      setPortalUser(portalUsers[0]);

      // Fetch all linked schools (only for users that have a school_id)
      const schoolIds = [...new Set(portalUsers.map(u => u.school_id).filter(Boolean))] as string[];
      if (schoolIds.length > 0) {
        const { data: schools } = await supabase
          .from("schools")
          .select("id, name, school_code, logo_url")
          .in("id", schoolIds);

        const schoolList = (schools || []) as PortalSchool[];
        setAvailableSchools(schoolList);
        setCurrentSchool(schoolList.find(s => s.id === portalUsers[0].school_id) || null);
      } else {
        setAvailableSchools([]);
        setCurrentSchool(null);
      }
    } catch {
      setPortalUser(null);
      setAllPortalUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchPortalUser(session.user.id), 0);
      } else {
        setPortalUser(null);
        setAllPortalUsers([]);
        setCurrentSchool(null);
        setAvailableSchools([]);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPortalUser(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPortalUser]);

  const switchSchool = (schoolId: string) => {
    const userForSchool = allPortalUsers.find(u => u.school_id === schoolId);
    if (userForSchool) {
      setPortalUser(userForSchool);
      setCurrentSchool(availableSchools.find(s => s.id === schoolId) || null);
    }
  };

  const signIn = async (identifier: string, password: string) => {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");

    let email = trimmed;

    // If not email, look up the email via edge function
    if (!isEmail) {
      try {
        const { data, error } = await supabase.functions.invoke("portal-lookup-login", {
          body: { identifier: trimmed },
        });

        if (error || !data?.email) {
          return { error: new Error("No account found with that identifier") };
        }
        email = data.email;
      } catch {
        return { error: new Error("Failed to look up account") };
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPortalUser(null);
    setAllPortalUsers([]);
    setCurrentSchool(null);
    setAvailableSchools([]);
  };

  return (
    <PortalAuthContext.Provider value={{
      user, session, portalUser, allPortalUsers, currentSchool, availableSchools,
      isLoading, isAuthenticated: !!portalUser,
      switchSchool, signIn, signOut,
    }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return context;
}
