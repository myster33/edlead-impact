import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, Moon, Sun, Eye, EyeOff, Users } from "lucide-react";
import { z } from "zod";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";
import { useTheme } from "next-themes";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, user, isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const from = (location.state as { from?: Location })?.from?.pathname || "/portal/dashboard";

  useEffect(() => {
    if (!authLoading && user && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [user, isAuthenticated, authLoading, navigate, from]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse({ email, password });
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
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
      } else {
        toast({ title: "Welcome!", description: "Successfully logged in." });
      }
    } finally {
      setIsLoading(false);
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
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <div className="relative h-16 w-auto">
              <img src={edleadLogo} alt="edLEAD Logo" className={`h-16 w-auto absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
              <img src={edleadLogoDark} alt="edLEAD Logo" className={`h-16 w-auto transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">General Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in as a parent, student, or educator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" disabled={isLoading} />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
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
            <p className="text-xs text-center text-muted-foreground">
              Your account is created by your school administrator. Contact your school if you need access.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
