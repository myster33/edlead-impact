import { Link } from "react-router-dom";
import { Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
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
  ],
  support: [
    { name: "Contact Us", path: "/contact" },
    { name: "Check Application Status", path: "/check-status" },
    { name: "FAQ", path: "/faq" },
  ],
};

export const Footer = () => {
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
              <a href="#" className="text-secondary-foreground/60 hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-secondary-foreground/60 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-secondary-foreground/60 hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-secondary-foreground/60 hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
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

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-secondary-foreground/70">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:info@edlead.co.za" className="hover:text-primary transition-colors">
                  info@edlead.co.za
                </a>
              </li>
            </ul>
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
