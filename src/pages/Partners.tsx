import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { School, Users, Calendar, BookOpen, Loader2 } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const partnershipOptions = [
  "School Participation",
  "Mentorship Support",
  "Event Sponsorship",
  "Leadership Resources",
  "Other",
];

const Partners = () => {
  const { displayedText } = useTypingAnimation("Partner With edLEAD", 50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    partnershipType: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: `Partnership Inquiry: ${formData.partnershipType} - ${formData.organization}`,
          message: `Organization: ${formData.organization}\nPartnership Type: ${formData.partnershipType}\n\nMessage:\n${formData.message}`,
        },
      });

      if (error) throw error;

      toast.success("Thank you for your interest! We'll be in touch soon.");
      setFormData({ name: "", email: "", organization: "", partnershipType: "", message: "" });
    } catch (error: any) {
      console.error("Error sending inquiry:", error);
      toast.error(error.message || "Failed to send inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
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

      {/* Partner Logos */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Partners & Supporters</h2>
            <p className="text-muted-foreground">
              Proudly working with leading organizations committed to youth development
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center max-w-5xl mx-auto">
            {[
              { name: "Department of Education", abbr: "DoE" },
              { name: "UNICEF", abbr: "UNICEF" },
              { name: "Save the Children", abbr: "STC" },
              { name: "World Vision", abbr: "WV" },
              { name: "MTN Foundation", abbr: "MTN" },
              { name: "Standard Bank", abbr: "SB" },
            ].map((partner, index) => (
              <div
                key={index}
                className="w-28 h-28 rounded-xl bg-background border border-border flex items-center justify-center p-4 hover:border-primary/30 hover:shadow-md transition-all"
                title={partner.name}
              >
                <span className="text-xl font-bold text-muted-foreground/70">{partner.abbr}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Interested in becoming a partner? Fill out the inquiry form below.
          </p>
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

            {/* Partnership Inquiry Form */}
            <div className="bg-background rounded-2xl p-8 border border-border">
              <h3 className="text-2xl font-bold text-foreground mb-4">Partnership Inquiry</h3>
              <p className="text-muted-foreground mb-6">
                Interested in partnering with edLEAD? Fill out the form below and we'll get in touch.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Your Name
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-foreground mb-2">
                    Organization Name
                  </label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="partnershipType" className="block text-sm font-medium text-foreground mb-2">
                    Partnership Interest
                  </label>
                  <Select
                    value={formData.partnershipType}
                    onValueChange={(value) => setFormData({ ...formData, partnershipType: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select partnership type" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnershipOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    minLength={5}
                    disabled={isSubmitting}
                    placeholder="Tell us about your organization and how you'd like to partner with edLEAD"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Submit Inquiry"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Partners;
