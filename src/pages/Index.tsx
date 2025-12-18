import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { WhySection } from "@/components/home/WhySection";
import { PillarsSection } from "@/components/home/PillarsSection";
import { ProgrammeSnapshot } from "@/components/home/ProgrammeSnapshot";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <WhySection />
      <PillarsSection />
      <ProgrammeSnapshot />
      <CTASection />
    </Layout>
  );
};

export default Index;
