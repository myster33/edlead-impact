import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Monitor, Users, Award, FileText, Briefcase, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import conferenceImage1 from "@/assets/programme-snapshot-conference.jpg";
import conferenceImage2 from "@/assets/programme-conference-2.jpg";
import conferenceImage3 from "@/assets/programme-conference-3.jpg";
import conferenceImage4 from "@/assets/programme-conference-4.jpg";

const conferenceImages = [conferenceImage1, conferenceImage2, conferenceImage3, conferenceImage4];

const features = [
  {
    icon: Calendar,
    title: "Three-Month Programme",
    description: "A comprehensive hybrid leadership journey",
  },
  {
    icon: Monitor,
    title: "Online Mentorship",
    description: "Weekly virtual training and guidance",
  },
  {
    icon: Users,
    title: "Monthly Meetups",
    description: "Leadership gatherings and peer networking",
  },
  {
    icon: FileText,
    title: "School Projects",
    description: "Learner-led impact initiatives",
  },
  {
    icon: Award,
    title: "Recognition & Awards",
    description: "Celebrating outstanding leadership",
  },
  {
    icon: Briefcase,
    title: "Career Essentials",
    description: "Support and industry linkage",
  },
];

export const ProgrammeSnapshot = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % conferenceImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-secondary text-secondary-foreground">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-6">
          {/* Left column - Text content aligned with top boxes */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Programme Snapshot
            </h2>
            <p className="text-secondary-foreground/80 text-lg mb-8 leading-relaxed">
              edLEAD Captains participate in a structured, three-month programme combining mentorship, training, collaboration, and practical leadership experience.
            </p>
            <Link to="/programme">
              <Button size="lg" className="gap-2">
                Explore the Programme
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Right column - Top 2 boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.slice(0, 2).map((feature, index) => (
              <div
                key={index}
                className={`bg-secondary-foreground/5 backdrop-blur rounded-lg p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/30 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                <feature.icon className="h-8 w-8 text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-secondary-foreground/70 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Left column - Image carousel aligned with bottom boxes */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            <div className="rounded-xl overflow-hidden shadow-lg h-full relative">
              {conferenceImages.map((image, index) => (
                <img 
                  key={index}
                  src={image} 
                  alt="Student leader speaking at edLEAD conference with diverse learners in the audience" 
                  className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-1000 ${
                    index === currentImageIndex ? 'opacity-100' : 'opacity-0 absolute inset-0'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right column - Bottom 4 boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.slice(2).map((feature, index) => (
              <div
                key={index + 2}
                className={`bg-secondary-foreground/5 backdrop-blur rounded-lg p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/30 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${(index + 2) * 100}ms` : '0ms',
                }}
              >
                <feature.icon className="h-8 w-8 text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-secondary-foreground/70 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
