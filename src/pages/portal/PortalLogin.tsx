import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, Moon, Sun, Eye, EyeOff, Users, User, Phone, School, KeyRound, CreditCard } from "lucide-react";
import { z } from "zod";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";
import edleadIcon from "@/assets/edlead-icon.png";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerify } from "@/components/admin/TwoFactorVerify";

const loginSchema = z.object({
  identifier: z.string().min(3, "Please enter your email, phone number, or User ID"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  idPassportNumber: z.string().min(5, "ID or Passport number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["student", "parent", "educator"], { required_error: "Select a role" }),
  studentIdNumber: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function PortalLogin() {
  const [tab, setTab] = useState("login");

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFaVerify, setShowTwoFaVerify] = useState(false);
  const [twoFaChannel, setTwoFaChannel] = useState<"email" | "sms">("email");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone" | "edleadid">("edleadid");

  // Signup state
  const [signupData, setSignupData] = useState({
    fullName: "", email: "", phone: "", idPassportNumber: "", password: "", confirmPassword: "",
    role: "" as string, studentIdNumber: "",
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);


  const { signIn, user, isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const from = (location.state as { from?: Location })?.from?.pathname || "/portal/dashboard";

  useEffect(() => {
    if (!authLoading && user && isAuthenticated && !showTwoFaVerify) {
      navigate(from, { replace: true });
    }
  }, [user, isAuthenticated, authLoading, navigate, from, showTwoFaVerify]);


  const getLoginPlaceholder = () => {
    switch (loginMethod) {
      case "phone": return "+27 xxx xxx xxxx";
      case "edleadid": return "EDL-XXXXXX";
      default: return "you@example.com";
    }
  };

  const getLoginIcon = () => {
    switch (loginMethod) {
      case "phone": return <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
      case "edleadid": return <img src={edleadIcon} alt="edLEAD" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />;
      default: return <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLoginLabel = () => {
    switch (loginMethod) {
      case "phone": return "Phone Number";
      case "edleadid": return "edLEAD ID";
      default: return "Email";
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse({ identifier, password });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive" });
        return;
      }

      // Check if user has 2FA enabled
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: portalUser } = await supabase
          .from("school_users")
          .select("two_fa_enabled, two_fa_channel")
          .eq("user_id", userData.user.id)
          .eq("is_active", true)
          .in("role", ["educator", "class_teacher", "subject_teacher", "parent", "student"])
          .limit(1)
          .maybeSingle();

        if (portalUser && (portalUser as any).two_fa_enabled) {
          setTwoFaChannel(((portalUser as any).two_fa_channel as "email" | "sms") || "email");
          setShowTwoFaVerify(true);
          return;
        }
      }

      toast({ title: "Welcome!", description: "Successfully logged in." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      signupSchema.parse(signupData);
      setSignupErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setSignupErrors(fieldErrors);
      }
      return;
    }

    setIsSigningUp(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/login`,
        },
      });

      if (authError) {
        toast({ title: "Registration Failed", description: authError.message, variant: "destructive" });
        return;
      }

      // Submit registration request for school approval
      const { error: reqError } = await supabase
        .from("portal_registration_requests" as any)
        .insert({
          email: signupData.email,
          full_name: signupData.fullName,
          phone: signupData.phone || null,
          role: signupData.role,
          school_id: null,
          student_id_number: signupData.studentIdNumber || null,
          id_passport_number: signupData.idPassportNumber,
          auth_user_id: authData.user?.id || null,
        } as any);

      if (reqError) {
        console.error("Registration request error:", reqError);
      }

      // Sign out - they need to verify email and wait for school approval
      await supabase.auth.signOut();

      toast({
        title: "Registration Submitted!",
        description: "Please verify your email. Your edLEAD ID will be sent via email and SMS once your account is set up.",
      });

      setTab("login");
      setSignupData({ fullName: "", email: "", phone: "", idPassportNumber: "", password: "", confirmPassword: "", role: "", studentIdNumber: "" });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({ title: "Enter your email", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/portal/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We've sent you a password reset link." });
        setShowForgotPassword(false);
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showTwoFaVerify) {
    return (
      <TwoFactorVerify
        onVerified={() => {
          setShowTwoFaVerify(false);
          toast({ title: "Welcome!", description: "Successfully verified." });
          navigate(from, { replace: true });
        }}
        onCancel={async () => {
          await supabase.auth.signOut();
          setShowTwoFaVerify(false);
        }}
        portalType="portal"
        twoFaChannel={twoFaChannel}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
        <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="absolute top-4 right-4">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="absolute top-4 right-4">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative h-14 w-auto">
              <img src={edleadLogo} alt="edLEAD Logo" className={`h-14 w-auto absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
              <img src={edleadLogoDark} alt="edLEAD Logo" className={`h-14 w-auto transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">General Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            For parents, students & educators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Login method selector */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                  <Button
                    type="button"
                    variant={loginMethod === "edleadid" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setLoginMethod("edleadid"); setIdentifier(""); }}
                  >
                    <img src={edleadIcon} alt="edLEAD" className="h-3 w-3 mr-1" />edLEAD ID
                  </Button>
                  <Button
                    type="button"
                    variant={loginMethod === "email" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setLoginMethod("email"); setIdentifier(""); }}
                  >
                    <Mail className="h-3 w-3 mr-1" />Email
                  </Button>
                  <Button
                    type="button"
                    variant={loginMethod === "phone" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setLoginMethod("phone"); setIdentifier(""); }}
                  >
                    <Phone className="h-3 w-3 mr-1" />Phone
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-identifier">{getLoginLabel()}</Label>
                  <div className="relative">
                    {getLoginIcon()}
                    <Input
                      id="login-identifier"
                      type={loginMethod === "email" ? "email" : "text"}
                      placeholder={getLoginPlaceholder()}
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Button type="button" variant="link" className="px-0 h-auto text-xs text-muted-foreground" onClick={() => setShowForgotPassword(true)}>
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <Select value={signupData.role} onValueChange={v => setSignupData(d => ({ ...d, role: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student / Learner</SelectItem>
                      <SelectItem value="parent">Parent / Guardian</SelectItem>
                      <SelectItem value="educator">Educator / Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                  {signupErrors.role && <p className="text-sm text-destructive">{signupErrors.role}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Your full name" value={signupData.fullName} onChange={e => setSignupData(d => ({ ...d, fullName: e.target.value }))} className="pl-10" />
                  </div>
                  {signupErrors.fullName && <p className="text-sm text-destructive">{signupErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label>ID / Passport Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Your ID or Passport number" value={signupData.idPassportNumber} onChange={e => setSignupData(d => ({ ...d, idPassportNumber: e.target.value }))} className="pl-10" />
                  </div>
                  {signupErrors.idPassportNumber && <p className="text-sm text-destructive">{signupErrors.idPassportNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={signupData.email} onChange={e => setSignupData(d => ({ ...d, email: e.target.value }))} className="pl-10" />
                  </div>
                  {signupErrors.email && <p className="text-sm text-destructive">{signupErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="+27..." value={signupData.phone} onChange={e => setSignupData(d => ({ ...d, phone: e.target.value }))} className="pl-10" />
                  </div>
                </div>


                {signupData.role === "student" && (
                  <div className="space-y-2">
                    <Label>Student ID Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input placeholder="Your student ID" value={signupData.studentIdNumber} onChange={e => setSignupData(d => ({ ...d, studentIdNumber: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupData.password} onChange={e => setSignupData(d => ({ ...d, password: e.target.value }))} className="pl-10" />
                    </div>
                    {signupErrors.password && <p className="text-sm text-destructive">{signupErrors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupData.confirmPassword} onChange={e => setSignupData(d => ({ ...d, confirmPassword: e.target.value }))} className="pl-10" />
                    </div>
                    {signupErrors.confirmPassword && <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>}
                  </div>
                </div>
                <Button type="button" variant="link" className="px-0 h-auto text-xs" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                  {showSignupPassword ? "Hide" : "Show"} passwords
                </Button>

                <Button type="submit" className="w-full" disabled={isSigningUp}>
                  {isSigningUp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Create Account"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  After verifying your email, your edLEAD ID will be sent via email and SMS. You can then link to a school from your portal.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
