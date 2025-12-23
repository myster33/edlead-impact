import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: "viewer" | "reviewer" | "admin";
  created_at: string;
  full_name?: string | null;
}

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMfaVerified: boolean;
  requiresMfa: boolean;
  setMfaVerified: (verified: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_MINUTES = 5;

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMfaVerified, setIsMfaVerified] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const { toast } = useToast();

  const handleSessionTimeout = useCallback(async () => {
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    await supabase.auth.signOut();
    setAdminUser(null);
    setIsMfaVerified(false);
    setRequiresMfa(false);
  }, [toast]);

  // Session timeout - only active when user is logged in and MFA verified
  useSessionTimeout({
    timeoutMinutes: SESSION_TIMEOUT_MINUTES,
    onTimeout: handleSessionTimeout,
    enabled: !!user && (!requiresMfa || isMfaVerified),
  });

  const checkMfaStatus = async () => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === "verified") || [];
      
      if (verifiedFactors.length > 0) {
        // Check if MFA challenge has been completed in this session
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aal?.currentLevel === "aal2") {
          // User has completed MFA verification
          setIsMfaVerified(true);
          setRequiresMfa(true);
        } else {
          // User has MFA enabled but hasn't verified yet
          setIsMfaVerified(false);
          setRequiresMfa(true);
        }
      } else {
        // No MFA factors, user doesn't need MFA
        setIsMfaVerified(true);
        setRequiresMfa(false);
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
      // Default to not requiring MFA on error
      setIsMfaVerified(true);
      setRequiresMfa(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer admin user fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchAdminUser(session.user.id);
            checkMfaStatus();
          }, 0);
        } else {
          setAdminUser(null);
          setIsMfaVerified(false);
          setRequiresMfa(false);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAdminUser(session.user.id);
        checkMfaStatus();
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching admin user:", error);
        setAdminUser(null);
      } else {
        setAdminUser(data as AdminUser | null);
      }
    } catch (err) {
      console.error("Error in fetchAdminUser:", err);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setMfaVerified = (verified: boolean) => {
    setIsMfaVerified(verified);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/admin`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
    setIsMfaVerified(false);
    setRequiresMfa(false);
  };

  const value = {
    user,
    session,
    adminUser,
    isLoading,
    isAdmin: !!adminUser,
    isMfaVerified,
    requiresMfa,
    setMfaVerified,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
