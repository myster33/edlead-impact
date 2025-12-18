import { MessageSquare, Heart, GraduationCap, Users } from "lucide-react";

const pillars = [
  {
    icon: MessageSquare,
    title: "Effective Communication",
    description: "Building confident communicators who collaborate, solve problems, and engage respectfully with peers and educators.",
    color: "bg-primary",
  },
  {
    icon: Heart,
    title: "Holistic Leadership",
    description: "Developing well-rounded leaders who lead with integrity, emotional intelligence, and vision.",
    color: "bg-secondary",
  },
  {
    icon: GraduationCap,
    title: "Academic Excellence",
    description: "Promoting discipline, strong study habits, and a growth mindset, with Captains serving as academic role models.",
    color: "bg-primary",
  },
  {
    icon: Users,
    title: "Social Development",
    description: "Encouraging learners to build inclusive communities, organise initiatives, and create meaningful impact.",
    color: "bg-secondary",
  },
];

export const PillarsSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Core Pillars
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four foundational principles that guide our approach to developing tomorrow's leaders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl p-8 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 ${pillar.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <div className="relative">
                <div className={`w-16 h-16 rounded-xl ${pillar.color} flex items-center justify-center mb-6`}>
                  <pillar.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
              <div className={`absolute bottom-0 left-0 h-1 ${pillar.color} w-0 group-hover:w-full transition-all duration-500`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
