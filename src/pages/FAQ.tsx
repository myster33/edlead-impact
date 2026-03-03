import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const faqSections = [
  {
    title: "Programme Overview",
    items: [
      {
        q: "What is edLEAD?",
        a: "edLEAD is a national youth leadership programme that equips high school learners with leadership, academic, and social skills to positively influence school culture and drive community transformation.",
      },
      {
        q: "How long is the programme?",
        a: "The programme runs for approximately 3 months and includes online mentorship sessions, leadership workshops, collaborative projects, and a final awards ceremony.",
      },
      {
        q: "Is the programme free?",
        a: "Yes, the edLEAD programme is completely free for all selected participants. There are no fees to apply or participate.",
      },
      {
        q: "Is the programme online or in-person?",
        a: "The programme is primarily delivered online, with a physical awards ceremony at the end to celebrate the achievements of all edLEAD Captains.",
      },
    ],
  },
  {
    title: "Eligibility & Admissions",
    items: [
      {
        q: "Who can apply to edLEAD?",
        a: "Any high school learner (Grade 8–12) or recent high school graduate in Africa can apply. You must demonstrate leadership potential and a willingness to commit to the full programme duration.",
      },
      {
        q: "Do I need to be nominated by my school?",
        a: "While teacher nominations strengthen your application, self-nominations are also accepted. High school graduates can self-nominate without a school endorsement.",
      },
      {
        q: "Can I apply if I'm from outside South Africa?",
        a: "Yes! edLEAD welcomes applications from learners across Africa. Select your country during the application process.",
      },
      {
        q: "When do applications open and close?",
        a: "Application windows are announced on our website and social media channels. Visit the Admissions page to check whether applications are currently open.",
      },
    ],
  },
  {
    title: "Application Process",
    items: [
      {
        q: "How do I apply?",
        a: "You can apply through our online application form on the Admissions page, or via our chat assistant which guides you step-by-step through the process.",
      },
      {
        q: "What documents do I need to apply?",
        a: "You'll need a recent passport-style photo, parent/guardian consent, and information about your school, extracurricular activities, and a community project idea.",
      },
      {
        q: "How will I know if my application was received?",
        a: "After submitting, you'll receive a reference number and a confirmation email. You can also check your application status on our Check Status page at any time.",
      },
      {
        q: "How long does the review process take?",
        a: "Applications are reviewed within 2–4 weeks of submission. You'll be notified by email once a decision has been made.",
      },
    ],
  },
  {
    title: "During the Programme",
    items: [
      {
        q: "What will I learn during the programme?",
        a: "You'll develop skills in leadership, public speaking, project management, teamwork, and community engagement through interactive workshops and mentorship sessions.",
      },
      {
        q: "How much time do I need to commit?",
        a: "Participants should dedicate approximately 3–5 hours per week for workshops, group activities, and project work. Sessions are scheduled to accommodate school timetables.",
      },
      {
        q: "Will I receive a certificate?",
        a: "Yes! All participants who successfully complete the programme receive an official edLEAD certificate of completion at the awards ceremony.",
      },
      {
        q: "Can I still participate if I don't have a laptop?",
        a: "You need access to a device with internet connectivity (smartphone, tablet, or computer). If device access is a challenge, please mention this in your application.",
      },
    ],
  },
  {
    title: "General & Support",
    items: [
      {
        q: "How can I contact edLEAD?",
        a: "You can reach us via email at info@edlead.co.za, through our website's live chat, or via our social media channels on Instagram, LinkedIn, TikTok, and Facebook.",
      },
      {
        q: "Can my school partner with edLEAD?",
        a: "Absolutely! Schools, NGOs, and corporate partners are welcome to collaborate with us. Visit our Partners page or contact us directly to explore opportunities.",
      },
      {
        q: "Can I submit a story or blog post?",
        a: "Yes! Current and past edLEAD Captains can share their leadership stories through our Leaders' Stories blog. You can submit via the blog page or through our chat assistant.",
      },
      {
        q: "Is my personal information safe?",
        a: "Yes. We take data privacy seriously. All personal information is securely stored and handled in accordance with our Privacy Policy and POPIA regulations.",
      },
    ],
  },
];

const FAQ = () => {
  const { displayedText } = useTypingAnimation("Frequently Asked Questions", 40);

  return (
    <Layout>
      <Helmet>
        <title>FAQ | edLEAD — Frequently Asked Questions</title>
        <meta name="description" content="Find answers to common questions about the edLEAD youth leadership programme, eligibility, application process, and more." />
        <meta property="og:title" content="FAQ | edLEAD — Frequently Asked Questions" />
        <meta property="og:description" content="Everything you need to know about applying to and participating in the edLEAD leadership programme." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://edlead.co.za/faq" />
        <meta property="og:image" content="https://edlead.co.za/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://edlead.co.za/faq" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqSections.flatMap(s => s.items.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": { "@type": "Answer", "text": item.a },
          }))),
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
              Everything you need to know about the edLEAD programme.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="space-y-12">
            {faqSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h2 className="text-2xl font-bold text-foreground mb-6">{section.title}</h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <AccordionItem
                      key={itemIdx}
                      value={`s${sectionIdx}-q${itemIdx}`}
                      className="border border-border rounded-xl px-6 data-[state=open]:bg-accent/50"
                    >
                      <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center p-8 rounded-2xl bg-muted border border-border">
            <h3 className="text-xl font-bold text-foreground mb-3">Still have questions?</h3>
            <p className="text-muted-foreground mb-6">
              We're here to help! Reach out to us directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button className="gap-2">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admissions">
                <Button variant="outline">Apply Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
