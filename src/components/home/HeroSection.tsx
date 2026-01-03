import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage1 from "@/assets/hero-students.jpg";
import heroImage2 from "@/assets/hero-students-2.jpg";
import heroImage3 from "@/assets/hero-students-3.jpg";
import heroImage4 from "@/assets/hero-students-4.jpg";
import heroImage5 from "@/assets/hero-students-5.jpg";
import { useState, useEffect } from "react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const heroImages = [heroImage1, heroImage2, heroImage3, heroImage4, heroImage5];
const fullHeadline = "Empowering Young Leaders to create Positive Impact";

export const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { displayedText } = useTypingAnimation(fullHeadline, 50);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    
    return () => clearInterval(imageInterval);
  }, []);

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Diverse student leaders collaborating ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-secondary/40" />
      </div>

      {/* Decorative circles */}
      <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 opacity-90" />
      <div className="absolute top-20 right-0 w-24 h-24 md:w-40 md:h-40 bg-primary rounded-full translate-x-1/2 opacity-80" />

      {/* Content */}
      <div className="container relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6 font-montserrat text-shadow-hero">
            {displayedText.includes("Positive") ? (
              <>
                {displayedText.substring(0, displayedText.indexOf("Positive Impact"))}
                <span className="text-primary">{displayedText.substring(displayedText.indexOf("Positive Impact"))}</span>
              </>
            ) : (
              displayedText
            )}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed max-w-2xl animate-fade-in">
            An impactful youth leadership programme that equips young people with the leadership, academic, and social skills needed to drive community transformation and build successful futures.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/admissions">
              <Button size="lg" className="w-full sm:w-auto text-base gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30">
                Apply Now
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/partners">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-300 hover:scale-105 hover:border-primary-foreground/50">
                Partner with edLEAD
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Image Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentImageIndex 
                ? "bg-primary w-6" 
                : "bg-primary-foreground/50 hover:bg-primary-foreground/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
