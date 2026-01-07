import { Layout } from "@/components/layout/Layout";
import { useTypingAnimation } from "@/hooks/use-typing-animation";

const Terms = () => {
  const { displayedText: animatedTitle } = useTypingAnimation("Terms of Use", 50);

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
            Guidelines for participating in the edLEAD programme and using our services, 
            including POPIA compliance information.
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
              <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the edLEAD for Student Leaders website and services, you agree 
                to be bound by these Terms of Use. If you are applying on behalf of a minor, you 
                confirm that you have the legal authority to agree to these terms on their behalf.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                These terms reflect our core values of integrity, excellence, service, and growth. 
                We expect all participants to uphold these principles in their engagement with edLEAD.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">2. Programme Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                The edLEAD programme is designed for young leaders who meet the following criteria:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Are between 10 and 25 years of age</li>
                <li>Are currently enrolled in a recognised educational institution</li>
                <li>Have demonstrated leadership potential or experience</li>
                <li>Have obtained parental or guardian consent (if under 18)</li>
                <li>Are committed to completing the full programme requirements</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">3. Code of Conduct</h2>
              <p className="text-muted-foreground leading-relaxed">
                All edLEAD participants are expected to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Act with Integrity:</strong> Be honest, ethical, and transparent in all interactions</li>
                <li><strong>Pursue Excellence:</strong> Give your best effort and maintain high standards</li>
                <li><strong>Serve Others:</strong> Contribute positively to your community and support fellow participants</li>
                <li><strong>Embrace Growth:</strong> Be open to learning, feedback, and personal development</li>
                <li><strong>Show Respect:</strong> Treat all individuals with dignity, regardless of background or beliefs</li>
                <li><strong>Maintain Confidentiality:</strong> Protect the privacy of fellow participants and programme information</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">4. Programme Commitments</h2>
              <p className="text-muted-foreground leading-relaxed">
                By joining edLEAD, participants commit to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Attending scheduled sessions, workshops, and events</li>
                <li>Completing assigned projects and leadership challenges</li>
                <li>Actively participating in mentorship activities</li>
                <li>Maintaining satisfactory academic performance</li>
                <li>Contributing to community service initiatives</li>
                <li>Providing feedback to help improve the programme</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Failure to meet these commitments may result in removal from the programme.
              </p>
            </div>

            {/* POPIA Section */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
              <h2 className="text-2xl font-bold text-foreground">5. POPIA Compliance & Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                In accordance with the Protection of Personal Information Act (POPIA) of South Africa, 
                edLEAD is committed to protecting your personal information and ensuring transparent 
                data practices.
              </p>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.1 Information We Collect</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Through applications, event registrations, and programme participation, we collect:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Personal details (name, date of birth, gender, contact information)</li>
                  <li>Educational information (school name, grade, academic activities)</li>
                  <li>Parent/guardian contact details and consent</li>
                  <li>Photos, videos, and leadership stories</li>
                  <li>Email addresses for communication purposes</li>
                  <li>Project ideas and leadership experiences</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.2 Purpose of Data Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your personal information is used for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Processing and evaluating programme applications</li>
                  <li>Programme administration, coordination, and communication</li>
                  <li>Mentorship matching and support</li>
                  <li>Creating promotional and educational materials</li>
                  <li>Impact measurement and programme improvement</li>
                  <li>Alumni engagement and networking</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.3 Consent for Photos, Stories & Media</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By participating in edLEAD and accepting these terms, you grant permission for 
                  photos, videos, and stories to be used for promotional purposes including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Website content and social media posts</li>
                  <li>Newsletters, reports, and press releases</li>
                  <li>Marketing materials and presentations</li>
                  <li>Partner communications and funding proposals</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  All media usage will celebrate youth leadership and programme impact. You may 
                  opt out of non-essential media use by contacting us in writing.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.4 Email Communications</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your email address will be used for programme updates, event invitations, 
                  newsletters, and important notifications. You may opt out of non-essential 
                  communications at any time by contacting info@edlead.co.za.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.5 Your Rights Under POPIA</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Access personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your data (subject to legal requirements)</li>
                  <li>Object to processing of your information</li>
                  <li>Withdraw consent at any time</li>
                  <li>Lodge a complaint with the Information Regulator of South Africa</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.6 Data Retention</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Personal information is retained for the duration of programme participation 
                  and a reasonable period thereafter for alumni engagement and impact tracking, 
                  unless you request earlier deletion.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">5.7 Minor's Data Protection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  For participants under 18 years, parent/guardian consent is mandatory. 
                  Parents/guardians may exercise data rights on behalf of their children 
                  and may request access, correction, or deletion of their child's data 
                  at any time.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on the edLEAD website and programme materials, including but not limited 
                to text, graphics, logos, images, and educational resources, is the property of 
                edLEAD or its content suppliers and is protected by intellectual property laws.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Participants may use programme materials for personal educational purposes but may 
                not reproduce, distribute, or create derivative works without written permission.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">7. Website Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                When using the edLEAD website, you agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide false or misleading information in applications or forms</li>
                <li>Attempt to gain unauthorised access to any part of the website</li>
                <li>Use the website for any unlawful purpose</li>
                <li>Interfere with the proper functioning of the website</li>
                <li>Collect or harvest personal information of other users</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">8. Safety and Wellbeing</h2>
              <p className="text-muted-foreground leading-relaxed">
                edLEAD is committed to providing a safe environment for all participants. We maintain 
                child protection policies and procedures, and all staff and volunteers undergo 
                appropriate background checks. Participants and their families are encouraged to 
                report any concerns to programme coordinators immediately.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to provide accurate information and quality programming, edLEAD:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Does not guarantee specific outcomes from programme participation</li>
                <li>Is not liable for any indirect, incidental, or consequential damages</li>
                <li>Reserves the right to modify or discontinue programme elements</li>
                <li>May change these terms with reasonable notice to participants</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">10. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these terms or programme participation will be resolved 
                through good-faith negotiation. If a resolution cannot be reached, disputes will 
                be subject to the laws of South Africa and the jurisdiction of its courts.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">11. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                edLEAD reserves the right to terminate a participant's involvement in the programme 
                for violations of these terms, the code of conduct, or behaviour that is detrimental 
                to the programme or other participants. Participants may also voluntarily withdraw 
                by providing written notice.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">12. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Use, to exercise your POPIA rights, or to 
                lodge any concerns, please contact:
              </p>
              <div className="bg-muted p-6 rounded-lg mt-4">
                <p className="text-foreground font-semibold">edLEAD for Student Leaders</p>
                <p className="text-muted-foreground">Email: info@edlead.co.za</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Information Officer for POPIA enquiries
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;