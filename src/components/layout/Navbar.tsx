import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import edleadLogo from "@/assets/edlead-logo.png";
import programmeConference from "@/assets/programme-conference.jpg";

const navLinks = [
  { name: "Why edLEAD", path: "/" },
  { name: "About", path: "/about" },
  { name: "Get Started", path: "/admissions" },
  { name: "Our Impact", path: "/impact" },
  { name: "Leaders' Blogs", path: "/blog" },
  { name: "Partners", path: "/partners" },
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
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              {navLinks.slice(0, 2).map((link) => (
                <NavigationMenuItem key={link.path}>
                  <Link
                    to={link.path}
                    className={`px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      location.pathname === link.path
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                </NavigationMenuItem>
              ))}
              
              {/* Programme Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`${
                  location.pathname === "/programme" ? "text-primary" : ""
                }`}>
                  Programme
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink asChild>
                    <Link
                      to="/programme"
                      className="group block w-[340px] p-4 bg-background rounded-lg no-underline outline-none transition-colors hover:bg-accent focus:bg-accent"
                    >
                      <div className="relative overflow-hidden rounded-md mb-3">
                        <img 
                          src={programmeConference} 
                          alt="Student leadership conference" 
                          className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground animate-pulse">
                          Applications Open
                        </Badge>
                      </div>
                      <div className="text-base font-semibold text-foreground mb-1">
                        Leadership Programme
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A 3-month journey of mentorship, workshops, and school projects for aspiring student leaders.
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {navLinks.slice(2).map((link) => (
                <NavigationMenuItem key={link.path}>
                  <Link
                    to={link.path}
                    className={`px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      location.pathname === link.path
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

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
              {navLinks.slice(0, 2).map((link) => (
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
              
              {/* Programme mobile link */}
              <Link
                to="/programme"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === "/programme"
                    ? "bg-accent text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Programme
              </Link>

              {navLinks.slice(2).map((link) => (
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
