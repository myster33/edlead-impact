import { AlertTriangle, Users, Target, Sparkles } from "lucide-react";

const challenges = [
  {
    icon: AlertTriangle,
    title: "Poor Discipline",
    description: "Many schools struggle with behavioral challenges that disrupt learning environments.",
  },
  {
    icon: Users,
    title: "Low Student Engagement",
    description: "Learners often feel disconnected from their school community and academic journey.",
  },
  {
    icon: Target,
    title: "Unsafe Environments",
    description: "Safety concerns prevent learners from reaching their full potential.",
  },
  {
    icon: Sparkles,
    title: "Limited Opportunities",
    description: "Students lack platforms to develop leadership and life skills.",
  },
];

export const WhySection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Why edLEAD?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Schools face challenges such as poor discipline, unsafe environments, low morale, and limited student engagement. edLEAD addresses these challenges by empowering learners to lead with confidence, responsibility, and purpose.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {challenges.map((item, index) => (
            <div
              key={index}
              className="bg-background rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
