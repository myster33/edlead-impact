import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send } from "lucide-react";

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const grades = ["Grade 8", "Grade 9", "Grade 10", "Grade 11"];

const ApplicationForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Application Submitted!",
        description: "Thank you for applying to edLEAD. We will review your application and contact you soon.",
      });
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            edLEAD for Student Leaders
          </h1>
          <p className="text-xl text-primary-foreground/90">
            Learner Application Form
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Learner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 1: Learner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name (as per school records) *</Label>
                    <Input id="fullName" required placeholder="Enter your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input id="dob" type="date" required />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Gender (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade (8–11) *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade} value={grade.toLowerCase().replace(" ", "-")}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input id="schoolName" required placeholder="Enter your school name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">School Address *</Label>
                  <Textarea id="schoolAddress" required placeholder="Enter school address" />
                </div>

                <div className="space-y-2">
                  <Label>Province *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province} value={province.toLowerCase().replace(" ", "-")}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Student Email Address *</Label>
                    <Input id="studentEmail" type="email" required placeholder="your.email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentPhone">Student Mobile Number *</Label>
                    <Input id="studentPhone" type="tel" required placeholder="e.g. 072 123 4567" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Parent/Guardian Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 2: Parent / Guardian Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Full Name *</Label>
                    <Input id="parentName" required placeholder="Enter parent/guardian name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship to Learner *</Label>
                    <Input id="relationship" required placeholder="e.g. Mother, Father, Guardian" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Parent/Guardian Email Address *</Label>
                    <Input id="parentEmail" type="email" required placeholder="parent.email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Parent/Guardian Mobile Number *</Label>
                    <Input id="parentPhone" type="tel" required placeholder="e.g. 072 123 4567" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Do you give consent for your child to participate in the edLEAD programme if selected? *</Label>
                  <RadioGroup required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="parentConsent-yes" />
                      <Label htmlFor="parentConsent-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="parentConsent-no" />
                      <Label htmlFor="parentConsent-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: School Nomination Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 3: School Nomination Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nominatingTeacher">Name of Nominating Teacher / School Representative *</Label>
                    <Input id="nominatingTeacher" required placeholder="Enter teacher name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherPosition">Position *</Label>
                    <Input id="teacherPosition" required placeholder="e.g. Teacher, HOD, Principal" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">School Email Address *</Label>
                    <Input id="schoolEmail" type="email" required placeholder="teacher@school.edu.za" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolContact">Contact Number *</Label>
                    <Input id="schoolContact" type="tel" required placeholder="e.g. 011 123 4567" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Has this learner been formally nominated by the school? *</Label>
                  <RadioGroup required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="nominated-yes" />
                      <Label htmlFor="nominated-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="nominated-no" />
                      <Label htmlFor="nominated-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground">
                    Note: Only school-nominated learners will be considered.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Leadership Experience & Involvement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 4: Leadership Experience & Involvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Are you currently a learner leader? (e.g. Prefect, RCL, Class Monitor, Club Leader) *</Label>
                  <RadioGroup required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="leader-yes" />
                      <Label htmlFor="leader-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="leader-no" />
                      <Label htmlFor="leader-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leaderRole">If yes, please describe your role(s):</Label>
                  <Textarea 
                    id="leaderRole" 
                    placeholder="Describe your leadership role(s) and responsibilities..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activities">Have you participated in any school or community activities? *</Label>
                  <Textarea 
                    id="activities" 
                    required
                    placeholder="Sports, clubs, volunteering, peer support, etc."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Motivation & Values */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 5: Motivation & Values
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="whyEdlead">Why do you want to become an edLEAD Captain? * (200–300 words)</Label>
                  <Textarea 
                    id="whyEdlead" 
                    required
                    placeholder="Share your motivation for joining edLEAD..."
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadershipMeaning">What does leadership mean to you as a learner? * (150–200 words)</Label>
                  <Textarea 
                    id="leadershipMeaning" 
                    required
                    placeholder="Describe what leadership means to you..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolChallenge">Describe a challenge in your school that you would like to help improve. *</Label>
                  <Textarea 
                    id="schoolChallenge" 
                    required
                    placeholder="Identify a challenge and how you would address it..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 6: School Impact Project */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 6: School Impact Project (Core Selection Section)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectIdea">If selected, what project would you like to lead at your school? *</Label>
                  <Textarea 
                    id="projectIdea" 
                    required
                    placeholder="Example: improving discipline, school safety, cleanliness, peer support, peacebuilding, study culture..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectProblem">What problem does this project address? *</Label>
                  <Textarea 
                    id="projectProblem" 
                    required
                    placeholder="Describe the problem your project aims to solve..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectBenefit">How would this project benefit your school community? *</Label>
                  <Textarea 
                    id="projectBenefit" 
                    required
                    placeholder="Explain the positive impact of your project..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectTeam">Who would you work with to make this project successful? *</Label>
                  <Textarea 
                    id="projectTeam" 
                    required
                    placeholder="Learners, teachers, clubs, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 7: Academic Commitment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 7: Academic Commitment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="manageSchoolwork">How do you manage your schoolwork and responsibilities? *</Label>
                  <Textarea 
                    id="manageSchoolwork" 
                    required
                    placeholder="Describe how you balance academics with other activities..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicImportance">Why is academic excellence important to you as a leader? *</Label>
                  <Textarea 
                    id="academicImportance" 
                    required
                    placeholder="Explain the connection between academics and leadership..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 8: Programme Commitment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 8: Programme Commitment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">The edLEAD programme requires:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Weekly online mentorship</li>
                    <li>Monthly virtual sessions</li>
                    <li>Quarterly in-person events</li>
                    <li>Monthly reporting</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Label>Are you willing and able to commit to this for one year? *</Label>
                  <RadioGroup required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="commit-yes" />
                      <Label htmlFor="commit-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="commit-no" />
                      <Label htmlFor="commit-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Do you have access to a smartphone, tablet, or computer for online sessions? *</Label>
                  <RadioGroup required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="device-yes" />
                      <Label htmlFor="device-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="device-no" />
                      <Label htmlFor="device-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Section 9: Declaration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 9: Declaration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Checkbox id="declaration1" required />
                  <Label htmlFor="declaration1" className="font-normal leading-relaxed">
                    I confirm that the information provided is true and correct. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="declaration2" required />
                  <Label htmlFor="declaration2" className="font-normal leading-relaxed">
                    I understand that selection into edLEAD is competitive and based on leadership potential, commitment, and school nomination. *
                  </Label>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="learnerSignature">Learner Signature (Typed) *</Label>
                    <Input id="learnerSignature" required placeholder="Type your full name as signature" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="learnerSignatureDate">Date *</Label>
                    <Input id="learnerSignatureDate" type="date" required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 10: Parent/Guardian Consent */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 10: Parent/Guardian Consent (Required)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Checkbox id="parentConsentFinal" required />
                  <Label htmlFor="parentConsentFinal" className="font-normal leading-relaxed">
                    I give permission for my child to participate in the edLEAD for Student Leaders programme if selected. *
                  </Label>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentSignatureName">Parent/Guardian Name *</Label>
                    <Input id="parentSignatureName" required placeholder="Enter full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentSignature">Signature (Typed) *</Label>
                    <Input id="parentSignature" required placeholder="Type name as signature" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentSignatureDate">Date *</Label>
                    <Input id="parentSignatureDate" type="date" required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optional Add-ons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Optional Uploads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="learnerPhoto">Upload learner photo (Optional)</Label>
                  <Input id="learnerPhoto" type="file" accept="image/*" className="cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportingDoc">Upload supporting document (Optional)</Label>
                  <Input id="supportingDoc" type="file" accept=".pdf,.doc,.docx" className="cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videoLink">Short video submission link (Optional)</Label>
                  <Input 
                    id="videoLink" 
                    type="url" 
                    placeholder="YouTube or Google Drive link: Why I should be an edLEAD Captain"
                  />
                  <p className="text-sm text-muted-foreground">
                    Share a link to your video explaining why you should be an edLEAD Captain.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="px-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default ApplicationForm;
