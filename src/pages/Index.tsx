import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/home/HeroSection";
import { WhySection } from "@/components/home/WhySection";
import { PillarsSection } from "@/components/home/PillarsSection";
import { ProgrammeSnapshot } from "@/components/home/ProgrammeSnapshot";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <Helmet>
        <title>edLEAD | Youth Leadership Programme for African High School Learners</title>
        <meta name="description" content="edLEAD empowers high school learners across Africa with leadership, academic, and social skills through a free 3-month online mentorship programme." />
        <meta property="og:title" content="edLEAD | Youth Leadership Programme" />
        <meta property="og:description" content="Empowering the next generation of African leaders through mentorship, workshops, and community projects." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://edlead.co.za/" />
        <meta property="og:image" content="https://edlead.co.za/og-image.png" />
        <link rel="canonical" href="https://edlead.co.za/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "edLEAD",
            "url": "https://edlead.co.za",
            "logo": "https://edlead.co.za/edlead-icon.png",
            "description": "edLEAD is a national youth leadership programme that equips high school learners across Africa with leadership, academic, and social skills.",
            "sameAs": [
              "https://www.facebook.com/edleadza",
              "https://www.instagram.com/edlead_za",
              "https://www.linkedin.com/company/edlead"
            ],
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "ZA"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "General Enquiries",
              "email": "info@edlead.co.za"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "edLEAD",
            "url": "https://edlead.co.za",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://edlead.co.za/blog?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      </Helmet>
      <HeroSection />
      <WhySection />
      <PillarsSection />
      <ProgrammeSnapshot />
      <CTASection />
    </Layout>
  );
};

export default Index;
