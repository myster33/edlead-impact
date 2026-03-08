import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchoolUser {
  id: string;
  user_id: string;
  school_id: string;
  role: "school_admin" | "hr" | "educator" | "class_teacher" | "subject_teacher" | "parent" | "student";
  full_name: string;
  email: string;
  phone?: string | null;
  profile_picture_url?: string | null;
  is_active: boolean;
}

interface School {
  id: string;
  name: string;
  school_code: string;
  logo_url?: string | null;
  is_verified: boolean;
}

interface SchoolAuthContextType {
  user: User | null;
  session: Session | null;
  schoolUser: SchoolUser | null;
  currentSchool: School | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, schoolCode: string, role: "school_admin" | "hr", fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const SchoolAuthContext = createContext<SchoolAuthContextType | undefined>(undefined);

export function SchoolAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [schoolUser, setSchoolUser] = useState<SchoolUser | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchoolUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("school_users")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("role", ["school_admin", "hr"])
        .maybeSingle();

      if (error || !data) {
        setSchoolUser(null);
        setCurrentSchool(null);
        setIsLoading(false);
        return;
      }

      setSchoolUser(data as SchoolUser);

      // Fetch school details
      const { data: school } = await supabase
        .from("schools")
        .select("id, name, school_code, logo_url, is_verified")
        .eq("id", data.school_id)
        .single();

      setCurrentSchool(school as School | null);
    } catch {
      setSchoolUser(null);
      setCurrentSchool(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchSchoolUser(session.user.id), 0);
      } else {
        setSchoolUser(null);
        setCurrentSchool(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSchoolUser(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchSchoolUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, schoolCode: string, role: "school_admin" | "hr", fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/school/login` },
    });

    if (error) return { error: error as Error | null };

    // Create school registration if school_admin
    if (data.user && role === "school_admin") {
      // School will be created by the user after verification
      toast({
        title: "Account created",
        description: "Please verify your email. Once verified, you can register your school.",
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSchoolUser(null);
    setCurrentSchool(null);
  };

  return (
    <SchoolAuthContext.Provider value={{
      user, session, schoolUser, currentSchool, isLoading,
      isAuthenticated: !!schoolUser,
      signIn, signUp, signOut,
    }}>
      {children}
    </SchoolAuthContext.Provider>
  );
}

export function useSchoolAuth() {
  const context = useContext(SchoolAuthContext);
  if (!context) throw new Error("useSchoolAuth must be used within SchoolAuthProvider");
  return context;
}
