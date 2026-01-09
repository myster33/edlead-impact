import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface PopiaTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "application" | "story";
}

export const PopiaTermsDialog = ({ open, onOpenChange, variant = "application" }: PopiaTermsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">edLEAD Terms & Conditions</DialogTitle>
          <DialogDescription>
            Protection of Personal Information Act (POPIA) Compliance
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Introduction & POPIA Compliance</h3>
              <p className="text-muted-foreground">
                edLEAD for Student Leaders is committed to protecting your personal information in accordance 
                with the Protection of Personal Information Act (POPIA) of South Africa. By submitting this 
                {variant === "application" ? " application" : " story"}, you consent to the collection, processing, 
                and storage of your personal data as described herein.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Information We Collect</h3>
              <p className="text-muted-foreground mb-2">
                {variant === "application" 
                  ? "Through this application, we collect:"
                  : "When you submit a story, we collect:"}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Personal details (name, date of birth, contact information)</li>
                <li>Educational information (school, grade, academic activities)</li>
                {variant === "application" && <li>Parent/guardian contact details</li>}
                <li>Photos and videos (if submitted)</li>
                <li>{variant === "application" ? "Leadership stories and project ideas" : "Your story content"}</li>
                <li>Email addresses for communication purposes</li>
                {variant === "story" && <li>Your edLEAD Captain reference number</li>}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Purpose of Data Collection</h3>
              <p className="text-muted-foreground mb-2">
                Your information will be used for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                {variant === "application" ? (
                  <>
                    <li>Processing and evaluating your application</li>
                    <li>Programme administration and communication</li>
                    <li>Mentorship matching and coordination</li>
                    <li>Creating promotional and educational materials featuring participant stories</li>
                    <li>Impact reporting and programme improvement</li>
                    <li>Connecting with partner organisations for programme delivery</li>
                  </>
                ) : (
                  <>
                    <li>Verify your participation in the edLEAD programme</li>
                    <li>Review and potentially publish your story on our platforms</li>
                    <li>Contact you regarding your submission status</li>
                    <li>Inspire other young leaders through your experiences</li>
                    <li>Showcase programme impact to stakeholders and partners</li>
                  </>
                )}
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Use of Photos, Stories & Media</h3>
              <p className="text-muted-foreground mb-2">
                By accepting these terms, you grant edLEAD permission to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Publish your {variant === "application" ? "photos and stories" : "story and accompanying media"} on our website and blog</li>
                <li>Share content on our social media platforms</li>
                <li>Use in promotional and educational materials</li>
                <li>Include in programme reports and presentations</li>
                {variant === "story" && <li>Edit your submission for clarity while maintaining the essence of your story</li>}
              </ul>
              <p className="text-muted-foreground mt-2">
                All media usage will be in the context of celebrating youth leadership and programme impact.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Email Communications</h3>
              <p className="text-muted-foreground">
                {variant === "application" 
                  ? "Your email address will be used to send programme updates, event invitations, newsletters, and important notifications. You may opt out of non-essential communications at any time by contacting us."
                  : "Your email address will be used to notify you about your submission status (approved/rejected), send confirmation of your submission, and communicate any questions about your story. We will not add you to marketing lists without separate consent."}
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Data Protection & Security</h3>
              <p className="text-muted-foreground">
                We implement appropriate technical and organisational measures to protect your 
                personal information against unauthorised access, alteration, or disclosure. 
                Your data is stored securely and access is limited to authorised personnel only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Your Rights Under POPIA</h3>
              <p className="text-muted-foreground mb-2">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Access your personal information held by us</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Object to processing of your information</li>
                <li>Withdraw consent at any time</li>
                <li>Lodge a complaint with the Information Regulator</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, contact us at info@edlead.co.za
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Data Retention</h3>
              <p className="text-muted-foreground">
                Your personal information will be retained for the duration of your participation 
                in the edLEAD programme and for a reasonable period thereafter for alumni engagement 
                and programme impact tracking, unless you request deletion.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Third-Party Sharing</h3>
              <p className="text-muted-foreground">
                We may share your information with trusted partner organisations solely for 
                programme delivery purposes. We do not sell or trade your personal information. 
                Any third parties are bound by confidentiality agreements and POPIA requirements.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. Minor's Data Protection</h3>
              <p className="text-muted-foreground">
                {variant === "application"
                  ? "For applicants under 18 years of age, parent/guardian consent is required. Parents/guardians may exercise rights on behalf of their children and may request access to, correction of, or deletion of their child's data at any time."
                  : "If you are under 18 years of age, by submitting this story you confirm that you have obtained permission from your parent or legal guardian for edLEAD to collect and use your personal information as described in these terms."}
              </p>
            </section>

            {variant === "application" && (
              <section>
                <h3 className="font-semibold text-base mb-2">11. Programme Conduct</h3>
                <p className="text-muted-foreground">
                  Participants are expected to uphold edLEAD's core values of Integrity, Excellence, 
                  Service, and Growth. Behaviour that contradicts these values may result in removal 
                  from the programme.
                </p>
              </section>
            )}

            <section>
              <h3 className="font-semibold text-base mb-2">{variant === "application" ? "12" : "11"}. Contact Information</h3>
              <p className="text-muted-foreground">
                For questions about these terms or to exercise your data rights, contact:
              </p>
              <div className="bg-muted p-3 rounded-lg mt-2">
                <p className="font-medium text-foreground">edLEAD for Student Leaders</p>
                <p className="text-muted-foreground">Email: info@edlead.co.za</p>
              </div>
            </section>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Last Updated: January 2025
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PopiaConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: "application" | "story";
}

export const PopiaConsentCheckbox = ({ checked, onCheckedChange, variant = "application" }: PopiaConsentCheckboxProps) => {
  const [showTerms, setShowTerms] = useState(false);
  
  return (
    <>
      <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Checkbox
            id="popiaConsent"
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="popiaConsent" className="text-sm font-medium cursor-pointer leading-relaxed">
              I have read and accept the{" "}
              <button 
                type="button" 
                onClick={() => setShowTerms(true)}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                Terms & Conditions
              </button>
              {" "}and consent to edLEAD collecting, storing, and using my information (for example photos, videos, and stories) for programme purposes in accordance with the Protection of Personal Information Act (POPIA). *
            </Label>
          </div>
        </div>
      </div>
      <PopiaTermsDialog open={showTerms} onOpenChange={setShowTerms} variant={variant} />
    </>
  );
};

interface PopiaConsentInlineProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onViewTerms: () => void;
}

export const PopiaConsentInline = ({ checked, onCheckedChange, onViewTerms }: PopiaConsentInlineProps) => {
  return (
    <div className="flex items-start space-x-3">
      <Checkbox 
        id="popiaConsent" 
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="flex-1">
        <Label htmlFor="popiaConsent" className="font-normal leading-relaxed">
          I have read and accept the{" "}
          <button 
            type="button" 
            onClick={onViewTerms}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <FileText className="h-3 w-3" />
            Terms & Conditions
          </button>
          {" "}and consent to edLEAD collecting, storing, and using my information (for example photos, videos, and stories) for programme purposes in accordance with the Protection of Personal Information Act (POPIA). *
        </Label>
      </div>
    </div>
  );
};
