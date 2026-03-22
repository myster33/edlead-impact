import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, School, Users, GraduationCap, Building2, Shield } from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";
import { Helmet } from "react-helmet-async";

const roles = [
  {
    label: "School Admin",
    icon: School,
    path: "/school/login",
    description: "School micro data and events/activities management",
    delay: "0ms",
  },
  {
    label: "School HR",
    icon: Building2,
    path: "/school/login",
    description: "Staff and human resources management",
    delay: "80ms",
  },
  {
    label: "Parent / Guardian",
    icon: Users,
    path: "/portal/login",
    description: "Track your child's academic records",
    delay: "160ms",
  },
  {
    label: "Student / Learner",
    icon: GraduationCap,
    path: "/portal/login",
    description: "Student portal and learning resources",
    delay: "240ms",
  },
  {
    label: "Business / Organisation Admin",
    icon: Building2,
    path: "/business/login",
    description: "Business Chats and Client Leads",
    delay: "320ms",
  },
  {
    label: "edLEAD Admin",
    icon: Shield,
    path: "/admin/login",
    description: "Internal administration dashboard",
    delay: "400ms",
  },
];

export default function UserAccess() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [exiting, setExiting] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    setExiting(true);
    setTimeout(() => navigate(path), 400);
  };

  return (
    <>
      <Helmet>
        <title>User Access | edLEAD</title>
        <meta name="description" content="Select your role to access the edLEAD portal – School Admin, HR, Parent, Student, Partner, or Admin." />
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 relative overflow-hidden">
        {/* Theme toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-4 right-4 z-10"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/15 blur-[100px] animate-user-access-orb-drift" />
          <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full bg-accent/30 blur-[80px] animate-user-access-orb-drift" style={{ animationDelay: "2s", animationDirection: "reverse" }} />
          <div className="absolute -bottom-32 left-1/3 w-[350px] h-[350px] rounded-full bg-primary/8 blur-[90px] animate-user-access-orb-drift" style={{ animationDelay: "4s" }} />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className={`flex flex-col items-center w-full max-w-3xl z-10 transition-all duration-400 ${exiting ? "opacity-0 translate-y-6" : ""}`}>
          {/* Logo */}
          <img
            src={theme === "dark" ? edleadLogoDark : edleadLogo}
            alt="edLEAD"
            className="h-14 mb-8 animate-user-access-fade-in"
          />

          {/* Heading */}
          <h1
            className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 animate-user-access-slide-up"
          >
            What is your title?
          </h1>
          <p className="text-muted-foreground text-center mb-10 animate-user-access-slide-up" style={{ animationDelay: "100ms" }}>
            Select your role to continue to the right portal.
          </p>

          {/* Role grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {roles.map((role) => (
              <button
                key={role.label}
                onClick={() => handleSelect(role.path)}
                className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-user-access-card-pop"
                style={{ animationDelay: role.delay }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <role.icon className="h-7 w-7" />
                </div>
                <span className="font-semibold text-foreground">{role.label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{role.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
