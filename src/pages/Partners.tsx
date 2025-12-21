import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { School, Users, Calendar, BookOpen, ArrowRight } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const partnershipTypes = [
  {
    icon: School,
    title: "School Participation",
    description: "Nominate learners from your school to participate in the edLEAD programme and build a culture of student leadership.",
  },
  {
    icon: Users,
    title: "Mentorship Support",
    description: "Volunteer as a mentor to guide and inspire the next generation of student leaders.",
  },
  {
    icon: Calendar,
    title: "Event Sponsorship",
    description: "Support our leadership events, workshops, and annual showcase ceremonies.",
  },
  {
    icon: BookOpen,
    title: "Leadership Resources",
    description: "Contribute educational materials, training resources, or expertise to enhance our programme.",
  },
];

const Partners = () => {
  const { displayedText } = useTypingAnimation("Partner With edLEAD", 50);
  
  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-primary-foreground/90 leading-relaxed">
              Join us in building a generation of ethical, confident, and socially responsible student leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Partnership Types */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">Partnership Opportunities</h2>
            <p className="text-lg text-muted-foreground">
              We work with schools, education organisations, NGOs, and corporate partners to expand youth leadership development across Africa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {partnershipTypes.map((type, index) => (
              <div key={index} className="bg-muted rounded-xl p-8 border border-border hover:border-primary/30 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-6">
                  <type.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{type.title}</h3>
                <p className="text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Why Partner With Us?</h2>
              <ul className="space-y-4">
                {[
                  "Make a meaningful impact on youth development",
                  "Support safer, more positive school environments",
                  "Connect with a network of schools across Africa",
                  "Align your organisation with education transformation",
                  "Receive recognition for your contribution",
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground text-sm">✓</span>
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background rounded-2xl p-8 border border-border">
              <h3 className="text-2xl font-bold text-foreground mb-4">Get in Touch</h3>
              <p className="text-muted-foreground mb-6">
                Interested in partnering with edLEAD? We'd love to discuss how we can work together to empower student leaders.
              </p>
              <Button size="lg" className="w-full gap-2">
                Contact Our Team
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Partners;
