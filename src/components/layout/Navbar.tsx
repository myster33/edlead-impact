import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import edleadLogo from "@/assets/edlead-logo.png";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Programme", path: "/programme" },
  { name: "Admissions", path: "/admissions" },
  { name: "Impact", path: "/impact" },
  { name: "Blog", path: "/blog" },
  { name: "Partners", path: "/partners" },
  { name: "Contact", path: "/contact" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top bar */}
      <div className="bg-primary">
        <div className="container flex h-10 items-center justify-end">
          <Link to="/contact">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              Contact Us
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Main nav */}
      <nav className="bg-background border-b border-border">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={edleadLogo} alt="edLEAD" className="h-12 md:h-14" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:block">
            <Link to="/admissions">
              <Button>Apply Now</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden border-t border-border">
            <div className="container py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === link.path
                      ? "bg-accent text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 px-4">
                <Link to="/admissions" onClick={() => setIsOpen(false)}>
                  <Button className="w-full">Apply Now</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
