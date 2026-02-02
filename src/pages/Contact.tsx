import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTypingAnimation } from "@/hooks/use-typing-animation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const countryCodes: { code: string; country: string }[] = [
  { code: "+27", country: "South Africa" },
  { code: "+234", country: "Nigeria" },
  { code: "+254", country: "Kenya" },
  { code: "+233", country: "Ghana" },
  { code: "+255", country: "Tanzania" },
  { code: "+256", country: "Uganda" },
  { code: "+263", country: "Zimbabwe" },
  { code: "+267", country: "Botswana" },
  { code: "+264", country: "Namibia" },
  { code: "+260", country: "Zambia" },
  { code: "+258", country: "Mozambique" },
  { code: "+250", country: "Rwanda" },
  { code: "+251", country: "Ethiopia" },
  { code: "+265", country: "Malawi" },
  { code: "+266", country: "Lesotho" },
  { code: "+268", country: "Eswatini" },
];

// Phone validation patterns by country code
const phonePatterns: { [code: string]: { regex: RegExp; message: string } } = {
  "+27": { regex: /^0\d{9}$/, message: "10 digits starting with 0 (e.g., 0721234567)" },
  "+234": { regex: /^0[789]\d{9}$/, message: "11 digits starting with 07, 08, or 09" },
  "+254": { regex: /^0[17]\d{8}$/, message: "10 digits starting with 01 or 07" },
  "+233": { regex: /^0[235]\d{8}$/, message: "10 digits starting with 02, 03, or 05" },
  "+255": { regex: /^0[67]\d{8}$/, message: "10 digits starting with 06 or 07" },
  "+256": { regex: /^0[37]\d{8}$/, message: "10 digits starting with 03 or 07" },
  "+263": { regex: /^0[17]\d{8}$/, message: "10 digits starting with 01 or 07" },
  "+267": { regex: /^7\d{7}$/, message: "8 digits starting with 7" },
  "+264": { regex: /^0[68]\d{7}$/, message: "9 digits starting with 06 or 08" },
  "+260": { regex: /^0[79]\d{8}$/, message: "10 digits starting with 07 or 09" },
  "+258": { regex: /^8[234567]\d{7}$/, message: "9 digits starting with 82-87" },
  "+250": { regex: /^07[238]\d{7}$/, message: "10 digits starting with 072, 073, or 078" },
  "+251": { regex: /^09\d{8}$/, message: "10 digits starting with 09" },
};

const validatePhone = (phone: string, countryCode: string): string => {
  if (!phone) return "";
  
  const cleanedValue = phone.replace(/[\s\-\(\)]/g, "");
  const pattern = phonePatterns[countryCode];
  
  if (pattern) {
    if (!pattern.regex.test(cleanedValue)) {
      return `Please enter a valid phone number: ${pattern.message}`;
    }
  } else {
    // Generic validation for countries without specific patterns
    if (!/^\d{7,15}$/.test(cleanedValue)) {
      return "Please enter a valid phone number (7-15 digits)";
    }
  }
  return "";
};

const Contact = () => {
  const { displayedText } = useTypingAnimation("Contact Us", 50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+27",
    phone: "",
    subject: "",
    message: "",
  });

  const handlePhoneBlur = () => {
    if (formData.phone) {
      const error = validatePhone(formData.phone, formData.countryCode);
      setPhoneError(error);
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone if provided
    if (formData.phone) {
      const phoneValidationError = validatePhone(formData.phone, formData.countryCode);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        toast.error("Please fix the phone number before submitting.");
        return;
      }
    }
    
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone ? `${formData.countryCode} ${formData.phone}` : "",
          subject: formData.subject,
          message: formData.message,
        },
      });

      if (error) throw error;

      toast.success("Thank you for your message! We'll get back to you soon.");
      setFormData({ name: "", email: "", countryCode: "+27", phone: "", subject: "", message: "" });
      setPhoneError("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {displayedText}<span className="animate-pulse">|</span>
            </h1>
            <p className="text-xl text-secondary-foreground/80 leading-relaxed">
              Have questions or want to get involved? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Your Name *
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <div className="flex">
                      <Select
                        value={formData.countryCode}
                        onValueChange={(value) => {
                          setFormData({ ...formData, countryCode: value });
                          setPhoneError("");
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-[100px] rounded-r-none border-r-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (phoneError) setPhoneError("");
                        }}
                        onBlur={handlePhoneBlur}
                        disabled={isSubmitting}
                        placeholder="e.g. 0721234567"
                        className={cn("rounded-l-none", phoneError && "border-destructive")}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-sm text-destructive mt-1">{phoneError}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    minLength={5}
                    disabled={isSubmitting}
                    placeholder="Please enter your message here (minimum 5 characters)"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <a href="mailto:info@edlead.co.za" className="text-muted-foreground hover:text-primary transition-colors">
                      info@edlead.co.za
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Location</h3>
                    <p className="text-muted-foreground">
                      19 Ameshoff St, Braamfontein, Johannesburg
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Map */}
              <div className="rounded-xl overflow-hidden border border-border">
                <iframe
                  src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=edLEAD,19+Ameshoff+St,Braamfontein,Johannesburg,South+Africa&zoom=17"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="edLEAD Office Location"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
