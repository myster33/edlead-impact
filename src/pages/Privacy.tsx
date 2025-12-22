import { Layout } from "@/components/layout/Layout";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const Privacy = () => {
  const { displayedText: animatedTitle } = useTypingAnimation("Privacy Policy", 50);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-secondary py-16 md:py-24">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-foreground mb-4">
            {animatedTitle}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-xl text-secondary-foreground/80 max-w-2xl">
            Your privacy matters to us. Learn how edLEAD protects and handles your information.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              <strong>Last Updated:</strong> January 2025
            </p>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                edLEAD for Student Leaders ("edLEAD," "we," "us," or "our") is committed to protecting 
                the privacy and personal information of all participants, applicants, parents, guardians, 
                and visitors. This Privacy Policy explains how we collect, use, disclose, and safeguard 
                your information when you interact with our programme and website.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                As an organisation dedicated to youth leadership development, we understand the 
                importance of protecting the personal information of young people and their families. 
                We are committed to handling all data with integrity, transparency, and in accordance 
                with applicable data protection laws.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Apply to the edLEAD programme</li>
                <li>Register for events or workshops</li>
                <li>Subscribe to our newsletter</li>
                <li>Contact us with inquiries</li>
                <li>Participate in surveys or feedback sessions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Personal Information may include:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Full name, date of birth, and gender</li>
                <li>Contact details (email, phone number, address)</li>
                <li>School information and academic details</li>
                <li>Parent or guardian contact information</li>
                <li>Leadership experience and extracurricular activities</li>
                <li>Photographs and videos (with consent)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                In alignment with our core values of integrity and service, we use collected information to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Process and evaluate programme applications</li>
                <li>Communicate about programme activities, events, and updates</li>
                <li>Provide educational resources and leadership development materials</li>
                <li>Connect participants with mentors and partner organisations</li>
                <li>Measure and report on programme impact and outcomes</li>
                <li>Improve our services and develop new initiatives</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Protecting Young People's Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                As a youth-focused organisation, we take additional care when handling information 
                relating to minors (persons under 18 years of age):
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>We require parental or guardian consent for all applicants under 18</li>
                <li>We limit data collection to what is necessary for programme participation</li>
                <li>We do not share minor's personal information with third parties for marketing purposes</li>
                <li>Parents and guardians may request access to, correction of, or deletion of their child's data</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organisational measures to protect personal 
                information against unauthorised access, alteration, disclosure, or destruction. 
                These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Secure, encrypted data storage and transmission</li>
                <li>Access controls limiting who can view personal information</li>
                <li>Regular security assessments and updates</li>
                <li>Staff training on data protection practices</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell, trade, or rent personal information. We may share information with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Partner Schools:</strong> To coordinate programme activities</li>
                <li><strong>Mentors:</strong> To facilitate mentorship relationships (with consent)</li>
                <li><strong>Service Providers:</strong> Who assist in operating our programme and website</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect rights and safety</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal requirements)</li>
                <li>Withdraw consent for data processing</li>
                <li>Lodge a complaint with a data protection authority</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">8. Cookies and Website Analytics</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our website may use cookies and similar technologies to enhance user experience 
                and analyse website traffic. You can control cookie preferences through your 
                browser settings.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">9. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our 
                practices or legal requirements. We will notify you of significant changes by 
                posting the updated policy on our website with a new "Last Updated" date.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or wish to exercise your rights, 
                please contact us at:
              </p>
              <div className="bg-muted p-6 rounded-lg mt-4">
                <p className="text-foreground font-semibold">edLEAD for Student Leaders</p>
                <p className="text-muted-foreground">Email: info@edlead.co.za</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
