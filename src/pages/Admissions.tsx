import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { Link } from "react-router-dom";

const requirements = [
  "Students (Grade 9–12) and Graduates from High School",
  "Nominated by their school or self-nominated (for graduates)",
  "Demonstrated leadership potential or commitment to positive change",
  "Willingness to participate in the full programme",
  "Commitment to complete community or school-based projects",
];

const steps = [
  {
    number: "01",
    title: "School Nomination",
    description: "Your school nominates students who show leadership potential and commitment to positive change.",
  },
  {
    number: "02",
    title: "Learner Application",
    description: "Complete the online application form with your details, motivation, and leadership aspirations.",
  },
  {
    number: "03",
    title: "Review & Selection",
    description: "Our team reviews all applications and selects candidates based on potential and commitment.",
  },
  {
    number: "04",
    title: "Confirmation & Onboarding",
    description: "Selected Captains receive confirmation and join the edLEAD onboarding programme.",
  },
];

const Admissions = () => {
  const { displayedText } = useTypingAnimation("Become an edLEAD Captain", 50);
  
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
              Take the first step towards transforming your school and developing your leadership potential.
            </p>
          </div>
        </div>
      </section>

      {/* Who Can Apply */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Who Can Apply?</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                We're looking for motivated high school learners who are passionate about making a positive difference in their schools and communities.
              </p>
              <ul className="space-y-4">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted rounded-2xl p-8 border border-border">
              <h3 className="text-2xl font-bold text-foreground mb-4">Ready to Apply?</h3>
              <p className="text-muted-foreground mb-6">
                Start your journey to becoming an edLEAD Captain today. Complete our online application form to be considered for the programme.
              </p>
              <Link to="/apply">
                <Button size="lg" className="w-full gap-2">
                  Start Application
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Applications for Cohort 1 are now open
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 bg-muted">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Application Process</h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1 pt-3">
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                    {index < steps.length - 1 && (
                      <div className="w-px h-8 bg-border ml-8 mt-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How long is the programme?",
                a: "The edLEAD programme runs for a full academic year, with weekly online sessions and quarterly in-person meetups.",
              },
              {
                q: "Is there a cost to participate?",
                a: "No, the edLEAD programme is free for selected Captains. All training materials and resources are provided.",
              },
              {
                q: "Can I apply if my school hasn't nominated me yet?",
                a: "We encourage you to speak with your school administration about the programme. Nominations must come through your school.",
              },
            ].map((faq, index) => (
              <div key={index} className="bg-muted rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Admissions;
