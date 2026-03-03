import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, GraduationCap, Mail, FileText, ArrowRight } from "lucide-react";

const suggestedLinks = [
  { name: "Home", path: "/", icon: Home },
  { name: "About edLEAD", path: "/about", icon: BookOpen },
  { name: "Admissions", path: "/admissions", icon: GraduationCap },
  { name: "FAQ", path: "/faq", icon: FileText },
  { name: "Contact Us", path: "/contact", icon: Mail },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <Helmet>
        <title>Page Not Found | edLEAD</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="py-20 md:py-32">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto">
            {/* Large 404 */}
            <h1 className="text-8xl md:text-9xl font-bold text-primary/20 mb-4">404</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>

            {/* Primary CTA */}
            <Link to="/">
              <Button size="lg" className="gap-2 mb-12">
                Go to Home <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            {/* Suggested pages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {suggestedLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-muted hover:bg-accent transition-colors group"
                >
                  <link.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground">{link.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
