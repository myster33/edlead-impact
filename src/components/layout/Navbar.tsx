import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
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

const navLinks = [
  { name: "Why edLEAD", path: "/" },
  { name: "About", path: "/about" },
  { name: "Get Started", path: "/admissions" },
  { name: "Our Impact", path: "/impact" },
  { name: "Leaders' Blogs", path: "/blog" },
  { name: "Partners", path: "/partners" },
];

const programmeSubLinks = [
  { name: "Programme Overview", path: "/programme", description: "Learn about our leadership programme" },
  { name: "Curriculum", path: "/programme#curriculum", description: "Explore what you'll learn" },
  { name: "Schedule", path: "/programme#schedule", description: "View the programme timeline" },
  { name: "Requirements", path: "/programme#requirements", description: "Eligibility and application criteria" },
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
                  <ul className="grid w-[300px] gap-2 p-4 bg-background">
                    {programmeSubLinks.map((subLink) => (
                      <li key={subLink.path}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={subLink.path}
                            className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">{subLink.name}</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                              {subLink.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
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
            <Link to="/apply">
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
              
              {/* Programme mobile submenu */}
              <div className="px-4 py-2">
                <div className="text-sm font-medium text-foreground mb-2">Programme</div>
                <div className="pl-4 space-y-1">
                  {programmeSubLinks.map((subLink) => (
                    <Link
                      key={subLink.path}
                      to={subLink.path}
                      onClick={() => setIsOpen(false)}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                        location.pathname === subLink.path
                          ? "bg-accent text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {subLink.name}
                    </Link>
                  ))}
                </div>
              </div>

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
                <Link to="/apply" onClick={() => setIsOpen(false)}>
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
