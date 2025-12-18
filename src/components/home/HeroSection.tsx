import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-students.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Student leaders collaborating"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-secondary/40" />
      </div>

      {/* Decorative circles */}
      <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 opacity-90" />
      <div className="absolute top-20 right-0 w-24 h-24 md:w-40 md:h-40 bg-primary rounded-full translate-x-1/2 opacity-80" />

      {/* Content */}
      <div className="container relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Empowering Student Leaders to Create{" "}
            <span className="text-primary">Positive Change</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed max-w-2xl">
            A national youth leadership programme equipping high school learners with leadership, academic, and social skills to transform their schools from within.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/admissions">
              <Button size="lg" className="w-full sm:w-auto text-base gap-2">
                Apply to Become an edLEAD Captain
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/partners">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                Partner With edLEAD
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
