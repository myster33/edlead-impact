import { Layout } from "@/components/layout/Layout";
import { Target, Eye, Rocket } from "lucide-react";

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About edLEAD
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed">
              Transforming Student Leaders. Transforming Schools.
            </p>
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Who We Are</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                edLEAD is a youth leadership development programme aligned with EduSchools' mission of creating intelligent, well-managed, and positive learning environments.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We identify and nurture high-potential learners, equipping them to become change-makers within their schools and communities. Through structured mentorship, practical training, and real-world leadership experiences, we prepare young South Africans to lead with integrity and purpose.
              </p>
            </div>
            <div className="bg-muted rounded-2xl p-8 md:p-12">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Eye className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Our Vision</h3>
                    <p className="text-muted-foreground text-sm">
                      To build a generation of ethical, confident, and socially responsible student leaders across South Africa.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Our Mission</h3>
                    <p className="text-muted-foreground text-sm">
                      To empower learners with leadership, academic, and social skills that enable them to positively influence school culture and drive sustainable change.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Rocket className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Our Impact</h3>
                    <p className="text-muted-foreground text-sm">
                      Creating lasting change through learner-led initiatives that transform school environments and build stronger communities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Integrity", "Excellence", "Service", "Growth"].map((value, index) => (
              <div key={index} className="bg-background rounded-xl p-6 text-center border border-border">
                <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{value[0]}</span>
                </div>
                <h3 className="font-semibold text-foreground">{value}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
