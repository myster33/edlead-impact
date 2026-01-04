import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Monitor, Users, Award, FileText, Briefcase, ArrowRight } from "lucide-react";

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
  return (
    <section className="py-20 bg-secondary text-secondary-foreground">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-secondary-foreground/5 backdrop-blur rounded-lg p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 transition-colors"
              >
                <feature.icon className="h-8 w-8 text-primary mb-4" />
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
