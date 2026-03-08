import { Link } from "react-router-dom";
import { Mail, Instagram, Linkedin, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);
import edleadLogoWhite from "@/assets/edlead-logo-white.png";

const footerLinks = {
  programme: [
    { name: "About edLEAD", path: "/about" },
    { name: "Programme Structure", path: "/programme" },
    { name: "Admissions", path: "/admissions" },
    { name: "Impact", path: "/impact" },
  ],
  community: [
    { name: "Student Blog", path: "/blog" },
    { name: "Partner With Us", path: "/partners" },
    { name: "User Access", path: "/user-access" },
  ],
  support: [
    { name: "Contact Us", path: "/contact" },
    { name: "Check Application Status", path: "/check-status" },
    { name: "FAQ", path: "/faq" },
  ],
};

export const Footer = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setSubscribing(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email: trimmed });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already subscribed", description: "This email is already on our mailing list." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Subscribed! 🎉", description: "You'll receive edLEAD updates in your inbox." });
        setEmail("");
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src={edleadLogoWhite} alt="edLEAD" className="h-12" />
            <p className="text-secondary-foreground/80 text-sm leading-relaxed">
              Transforming Young Leaders for Positive Impact. A youth leadership programme empowering learners.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="https://www.linkedin.com/company/edlead/" target="_blank" rel="noopener noreferrer" className="text-secondary-foreground/60 hover:text-primary transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/edlead.africa/" target="_blank" rel="noopener noreferrer" className="text-secondary-foreground/60 hover:text-primary transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.tiktok.com/@edleadafrica" target="_blank" rel="noopener noreferrer" className="text-secondary-foreground/60 hover:text-primary transition-colors" aria-label="TikTok">
                <TikTokIcon className="h-5 w-5" />
              </a>
              <a href="https://www.facebook.com/edleadafrica" target="_blank" rel="noopener noreferrer" className="text-secondary-foreground/60 hover:text-primary transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Programme */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Programme</h4>
            <ul className="space-y-3">
              {footerLinks.programme.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-secondary-foreground/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Community</h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-secondary-foreground/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Get in Touch</h4>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/70">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:info@edlead.co.za" className="hover:text-primary transition-colors">
                  info@edlead.co.za
                </a>
              </li>
            </ul>

            {/* Newsletter */}
            <div>
              <h5 className="font-medium text-sm mb-3">Stay Updated</h5>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/40 h-9 text-sm"
                  required
                />
                <Button type="submit" size="sm" disabled={subscribing} className="shrink-0 h-9">
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom bar */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-secondary-foreground/60">
            © 2026 edLEAD for Student Leaders. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-secondary-foreground/60">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
