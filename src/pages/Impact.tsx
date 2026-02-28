import { Layout } from "@/components/layout/Layout";
import { Target, Shield, TrendingUp, Users } from "lucide-react";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { Helmet } from "react-helmet-async";
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
  { metric: "Improved discipline and cooperation", icon: "📈" },
  { metric: "Measurable learner-led initiatives", icon: "🎯" },
  { metric: "Increased confidence and leadership skills", icon: "💪" },
  { metric: "A sustainable national student leadership network", icon: "🌍" },
];

const Impact = () => {
  const { displayedText } = useTypingAnimation("Our Impact", 50);
  
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
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Our Goals</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {goals.map((goal, index) => (
              <div key={index} className="flex gap-4 p-6 rounded-xl bg-muted border border-border">
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
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Expected Outcomes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {outcomes.map((outcome, index) => (
              <div key={index} className="bg-primary-foreground/10 rounded-xl p-6 text-center backdrop-blur">
                <span className="text-4xl mb-4 block">{outcome.icon}</span>
                <p className="font-medium">{outcome.metric}</p>
              </div>
            ))}
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
