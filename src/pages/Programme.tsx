import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Monitor, Calendar, Users, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const programmeStructure = [
  {
    icon: Monitor,
    frequency: "Weekly",
    title: "Online Mentorship",
    description: "Virtual mentorship and leadership development sessions with experienced facilitators.",
  },
  {
    icon: Calendar,
    frequency: "Monthly",
    title: "Leadership Workshops",
    description: "Virtual leadership workshops, peer discussions, and collaborative learning.",
  },
  {
    icon: Users,
    frequency: "Quarterly",
    title: "In-Person Meetups",
    description: "Physical gatherings, showcases, inspiration events, and networking opportunities.",
  },
  {
    icon: FileText,
    frequency: "Ongoing",
    title: "School Projects",
    description: "Learner-led initiatives focused on safety, discipline, cleanliness, peacebuilding, or positive behaviour.",
  },
];

const Programme = () => {
  const { displayedText } = useTypingAnimation("The edLEAD Programme", 50);
  
  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed">
              A three-month journey of growth, mentorship, and impact for aspiring student leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">Programme Overview</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              edLEAD selects learners nominated by their schools to become <strong className="text-foreground">edLEAD Captains</strong>. Captains participate in a structured, three-month programme combining mentorship, training, collaboration, and practical leadership experience.
            </p>
          </div>

          {/* What you'll gain */}
          <div className="bg-muted rounded-2xl p-8 md:p-12 mb-16">
            <h3 className="text-2xl font-bold text-foreground mb-8 text-center">What You'll Gain</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                "Leadership and communication skills",
                "Peer networking opportunities",
                "Mentorship from experienced leaders",
                "Practical project management experience",
                "Recognition and certifications",
                "A platform to create real change",
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Programme Structure */}
      <section className="py-20 bg-muted">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Programme Structure</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {programmeStructure.map((item, index) => (
              <div key={index} className="bg-background rounded-xl p-8 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-primary">{item.frequency}</span>
                    <h3 className="text-xl font-bold text-foreground mt-1 mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Begin Your Leadership Journey?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Applications are open for high school learners who want to make a positive difference in their schools.
          </p>
          <Link to="/admissions">
            <Button size="lg" className="gap-2">
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Programme;
