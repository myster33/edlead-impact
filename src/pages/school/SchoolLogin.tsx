import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, Moon, Sun, Eye, EyeOff, School, User, Phone, Building2 } from "lucide-react";
import { z } from "zod";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  schoolName: z.string().min(2, "School name must be at least 2 characters").max(200),
  schoolAddress: z.string().min(5, "School address is required").max(500),
  province: z.string().min(1, "Province is required"),
  role: z.enum(["school_admin", "hr"]),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

export default function SchoolLogin() {
  const [activeTab, setActiveTab] = useState("login");
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSchoolName, setRegSchoolName] = useState("");
  const [regSchoolAddress, setRegSchoolAddress] = useState("");
  const [regProvince, setRegProvince] = useState("");
  const [regRole, setRegRole] = useState<"school_admin" | "hr">("school_admin");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { signIn, signUp, user, isAuthenticated, isLoading: authLoading } = useSchoolAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const from = (location.state as { from?: Location })?.from?.pathname || "/school/dashboard";

  useEffect(() => {
    if (!authLoading && user && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [user, isAuthenticated, authLoading, navigate, from]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
      setLoginErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setLoginErrors(fieldErrors);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
      } else {
        toast({ title: "Welcome!", description: "Successfully logged in." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerSchema.parse({
        fullName: regFullName, email: regEmail, phone: regPhone,
        password: regPassword, confirmPassword: regConfirmPassword,
        schoolName: regSchoolName, schoolAddress: regSchoolAddress,
        province: regProvince, role: regRole,
      });
      setRegErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setRegErrors(fieldErrors);
      }
      return;
    }

    setIsRegistering(true);
    try {
      const { error } = await signUp(regEmail, regPassword, regSchoolName, regSchoolAddress, regProvince, regRole, regFullName, regPhone);
      if (error) {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
      } else {
        setRegistrationSuccess(true);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      forgotPasswordSchema.parse({ email: forgotEmail });
    } catch {
      return;
    }

    setIsSendingReset(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/school/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setResetSent(true);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="absolute top-4 right-4">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <School className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <div className="relative h-16 w-auto">
              <img src={edleadLogo} alt="edLEAD Logo" className={`h-16 w-auto absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
              <img src={edleadLogoDark} alt="edLEAD Logo" className={`h-16 w-auto transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Schools Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            {showForgotPassword ? "Reset your password" : activeTab === "login" ? "Sign in to manage your school" : "Register your school"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <div className="space-y-4">
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      If an account exists with <strong>{forgotEmail}</strong>, you'll receive a password reset link shortly.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setShowForgotPassword(false); setResetSent(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="forgot-email" type="email" placeholder="admin@school.edu" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="pl-10" disabled={isSendingReset} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSendingReset}>
                    {isSendingReset ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                    Back to Sign In
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="admin@school.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                    </div>
                    {loginErrors.email && <p className="text-sm text-destructive">{loginErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginErrors.password && <p className="text-sm text-destructive">{loginErrors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowForgotPassword(true)}>
                    Forgot your password?
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {registrationSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
                      <h3 className="font-semibold text-foreground mb-1">Registration Submitted!</h3>
                      <p className="text-sm text-muted-foreground">
                        Please verify your email address. Once verified, an edLEAD administrator will review and verify your school registration before you can access the portal.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => { setRegistrationSuccess(false); setActiveTab("login"); }}>
                      Go to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="reg-name" placeholder="John Doe" value={regFullName} onChange={e => setRegFullName(e.target.value)} className="pl-10" disabled={isRegistering} />
                      </div>
                      {regErrors.fullName && <p className="text-sm text-destructive">{regErrors.fullName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="reg-email" type="email" placeholder="admin@school.edu" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="pl-10" disabled={isRegistering} />
                      </div>
                      {regErrors.email && <p className="text-sm text-destructive">{regErrors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="reg-phone" placeholder="+27 12 345 6789" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="pl-10" disabled={isRegistering} />
                      </div>
                      {regErrors.phone && <p className="text-sm text-destructive">{regErrors.phone}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-role">Your Role</Label>
                      <Select value={regRole} onValueChange={(v) => setRegRole(v as "school_admin" | "hr")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school_admin">School Administrator</SelectItem>
                          <SelectItem value="hr">HR Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      {regErrors.role && <p className="text-sm text-destructive">{regErrors.role}</p>}
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" /> School Details
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-school">School Name</Label>
                      <Input id="reg-school" placeholder="Springfield High School" value={regSchoolName} onChange={e => setRegSchoolName(e.target.value)} disabled={isRegistering} />
                      {regErrors.schoolName && <p className="text-sm text-destructive">{regErrors.schoolName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-address">School Address</Label>
                      <Input id="reg-address" placeholder="123 Main Street, City" value={regSchoolAddress} onChange={e => setRegSchoolAddress(e.target.value)} disabled={isRegistering} />
                      {regErrors.schoolAddress && <p className="text-sm text-destructive">{regErrors.schoolAddress}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-province">Province</Label>
                      <Select value={regProvince} onValueChange={setRegProvince}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {regErrors.province && <p className="text-sm text-destructive">{regErrors.province}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-password">Password</Label>
                        <div className="relative">
                          <Input id="reg-password" type={showRegPassword ? "text" : "password"} placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="pr-10" disabled={isRegistering} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowRegPassword(!showRegPassword)}>
                            {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {regErrors.password && <p className="text-sm text-destructive">{regErrors.password}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-confirm">Confirm</Label>
                        <Input id="reg-confirm" type={showRegPassword ? "text" : "password"} placeholder="••••••••" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} disabled={isRegistering} />
                        {regErrors.confirmPassword && <p className="text-sm text-destructive">{regErrors.confirmPassword}</p>}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                      <p>After registration, your school will be reviewed and verified by the edLEAD administration team before you can access the portal.</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isRegistering}>
                      {isRegistering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</> : "Register School"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
