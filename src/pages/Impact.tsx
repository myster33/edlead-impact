import { Layout } from "@/components/layout/Layout";
import { Target, Shield, TrendingUp, Users, Quote } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const goals = [
  {
    icon: Users,
    title: "Build Student Leadership Capacity",
    description: "Developing confident, capable student leaders across African schools.",
  },
  {
    icon: Shield,
    title: "Promote Safer Schools",
    description: "Creating more positive and secure school environments through peer leadership.",
  },
  {
    icon: Target,
    title: "Encourage Accountability",
    description: "Fostering a culture of responsibility and ownership among learners.",
  },
  {
    icon: TrendingUp,
    title: "Strengthen School Culture",
    description: "Transforming school communities through sustainable peer-led initiatives.",
  },
];

const outcomes = [
  { metric: "Improved discipline and cooperation", icon: TrendingUp },
  { metric: "Measurable learner-led initiatives", icon: Target },
  { metric: "Increased confidence and leadership skills", icon: Shield },
  { metric: "A sustainable national student leadership network", icon: Users },
];

interface Testimonial {
  id: string;
  name: string;
  role: string;
  school: string;
  province: string;
  quote: string;
}

const fallbackTestimonials: Testimonial[] = [
  {
    id: "f1",
    name: "Thando Molefe",
    role: "edLEAD Captain",
    school: "Pretoria High School",
    province: "Gauteng",
    quote: "edLEAD gave me the confidence to stand up and lead. I started a peer mentoring programme that now helps over 30 learners at my school.",
  },
  {
    id: "f2",
    name: "Amahle Ndlovu",
    role: "edLEAD Captain",
    school: "Durban Girls' College",
    province: "KwaZulu-Natal",
    quote: "Before edLEAD, I was afraid to speak in front of my class. Now I've presented at two provincial youth conferences. This programme changed my life.",
  },
  {
    id: "f3",
    name: "Sipho Mahlangu",
    role: "edLEAD Captain",
    school: "Mbilwi Secondary School",
    province: "Limpopo",
    quote: "The mentorship and workshops taught me that leadership is about service. My community project brought clean water awareness to 5 surrounding villages.",
  },
  {
    id: "f4",
    name: "Naledi Khumalo",
    role: "edLEAD Captain",
    school: "Paarl Gimnasium",
    province: "Western Cape",
    quote: "edLEAD connected me with leaders from across the country. The friendships and skills I built will last a lifetime.",
  },
];

const Impact = () => {
  const { displayedText } = useTypingAnimation("Our Impact", 50);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [visibleOutcomes, setVisibleOutcomes] = useState<boolean[]>(new Array(outcomes.length).fill(false));
  const [visibleGoals, setVisibleGoals] = useState<boolean[]>(new Array(goals.length).fill(false));
  const outcomesRef = useRef<HTMLDivElement>(null);
  const goalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            outcomes.forEach((_, i) => {
              setTimeout(() => {
                setVisibleOutcomes((prev) => {
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }, i * 150);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    if (outcomesRef.current) observer.observe(outcomesRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            goals.forEach((_, i) => {
              setTimeout(() => {
                setVisibleGoals((prev) => {
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }, i * 150);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    if (goalsRef.current) observer.observe(goalsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id, name, role, school, province, quote")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setTestimonials(data);
      }
    };
    fetchTestimonials();
  }, []);
  
  return (
    <Layout>
      <Helmet>
        <title>Our Impact | edLEAD — Measuring Change in African Schools</title>
        <meta name="description" content="See how edLEAD is building student leadership capacity, promoting safer schools, and strengthening school culture across Africa." />
        <meta property="og:title" content="Our Impact | edLEAD — Measuring Change in African Schools" />
        <meta property="og:description" content="Measuring the change we create in schools and communities across Africa through student leadership development." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://edlead.co.za/impact" />
        <meta property="og:image" content="https://edlead.co.za/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Impact | edLEAD" />
        <meta name="twitter:description" content="Measuring the change we create in schools and communities across Africa." />
        <link rel="canonical" href="https://edlead.co.za/impact" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Our Impact",
          "description": "Measuring the change edLEAD creates in schools and communities across Africa.",
          "url": "https://edlead.co.za/impact",
          "isPartOf": { "@type": "WebSite", "name": "edLEAD", "url": "https://edlead.co.za" }
        })}</script>
      </Helmet>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed">
              Measuring the change we create in schools and communities across Africa.
            </p>
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="py-20 overflow-hidden">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Our Goals</h2>
          <div ref={goalsRef} className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {goals.map((goal, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 rounded-xl bg-muted border border-border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md"
                style={{
                  opacity: visibleGoals[index] ? 1 : 0,
                  transform: visibleGoals[index]
                    ? "translateX(0) scale(1)"
                    : index % 2 === 0
                      ? "translateX(-40px) scale(0.95)"
                      : "translateX(40px) scale(0.95)",
                  transition: `opacity 0.6s ease-out, transform 0.6s ease-out`,
                }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <goal.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{goal.title}</h3>
                  <p className="text-muted-foreground">{goal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expected Outcomes */}
      <section className="py-20 bg-primary text-primary-foreground overflow-hidden">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Expected Outcomes</h2>
          <div ref={outcomesRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {outcomes.map((outcome, index) => (
              <div
                key={index}
                className="bg-primary-foreground/10 rounded-xl p-6 text-center backdrop-blur transition-all duration-700 ease-out hover:scale-105 hover:-translate-y-1 hover:bg-primary-foreground/20"
                style={{
                  opacity: visibleOutcomes[index] ? 1 : 0,
                  transform: visibleOutcomes[index]
                    ? "translateY(0) scale(1)"
                    : "translateY(40px) scale(0.95)",
                  transition: `opacity 0.6s ease-out, transform 0.6s ease-out`,
                }}
              >
                <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
                  <outcome.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="font-medium">{outcome.metric}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">What Our Leaders Say</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Hear from edLEAD Captains who are making a difference in their schools and communities.
          </p>

          <div className="max-w-5xl mx-auto px-8 md:px-12">
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[Autoplay({ delay: 5000 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((t) => (
                  <CarouselItem key={t.id} className="pl-4 md:basis-1/2">
                    <div className="h-full p-6 rounded-2xl border border-border bg-muted flex flex-col">
                      <Quote className="h-8 w-8 text-primary/30 mb-4 flex-shrink-0" />
                      <blockquote className="text-foreground leading-relaxed mb-6 flex-1">
                        "{t.quote}"
                      </blockquote>
                      <div className="border-t border-border pt-4">
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.role} · {t.school}</p>
                        <p className="text-xs text-muted-foreground">{t.province}</p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-muted">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-12">Cohort 1 Target Growth Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { number: 20, suffix: "+", label: "Schools Reached" },
              { number: 100, suffix: "+", label: "Students Applications" },
              { number: 50, suffix: "+", label: "Leaders' Stories" },
              { number: 9, suffix: "", label: "Provinces Targeted" },
            ].map((stat, index) => (
              <div key={index}>
                <AnimatedCounter 
                  end={stat.number} 
                  suffix={stat.suffix}
                  className="text-4xl md:text-5xl font-bold text-primary mb-2"
                />
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Impact;
