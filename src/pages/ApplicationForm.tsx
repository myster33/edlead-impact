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
import { Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const grades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

interface FormData {
  full_name: string;
  date_of_birth: string;
  gender: string;
  grade: string;
  school_name: string;
  school_address: string;
  province: string;
  student_email: string;
  student_phone: string;
  parent_name: string;
  parent_relationship: string;
  parent_email: string;
  parent_phone: string;
  parent_consent: string;
  nominating_teacher: string;
  teacher_position: string;
  school_email: string;
  school_contact: string;
  formally_nominated: string;
  is_learner_leader: string;
  leader_roles: string;
  school_activities: string;
  why_edlead: string;
  leadership_meaning: string;
  school_challenge: string;
  project_idea: string;
  project_problem: string;
  project_benefit: string;
  project_team: string;
  manage_schoolwork: string;
  academic_importance: string;
  willing_to_commit: string;
  has_device_access: string;
  learner_signature: string;
  learner_signature_date: string;
  parent_signature_name: string;
  parent_signature: string;
  parent_signature_date: string;
  video_link: string;
}

const ApplicationForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationRef, setApplicationRef] = useState("");
  
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    date_of_birth: "",
    gender: "",
    grade: "",
    school_name: "",
    school_address: "",
    province: "",
    student_email: "",
    student_phone: "",
    parent_name: "",
    parent_relationship: "",
    parent_email: "",
    parent_phone: "",
    parent_consent: "",
    nominating_teacher: "",
    teacher_position: "",
    school_email: "",
    school_contact: "",
    formally_nominated: "",
    is_learner_leader: "",
    leader_roles: "",
    school_activities: "",
    why_edlead: "",
    leadership_meaning: "",
    school_challenge: "",
    project_idea: "",
    project_problem: "",
    project_benefit: "",
    project_team: "",
    manage_schoolwork: "",
    academic_importance: "",
    willing_to_commit: "",
    has_device_access: "",
    learner_signature: "",
    learner_signature_date: "",
    parent_signature_name: "",
    parent_signature: "",
    parent_signature_date: "",
    video_link: "",
  });

  const [declarations, setDeclarations] = useState({
    declaration1: false,
    declaration2: false,
    parentConsentFinal: false,
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!declarations.declaration1 || !declarations.declaration2 || !declarations.parentConsentFinal) {
      toast({
        title: "Missing Declarations",
        description: "Please check all declaration boxes before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationPayload = {
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        grade: formData.grade,
        school_name: formData.school_name,
        school_address: formData.school_address,
        province: formData.province,
        student_email: formData.student_email,
        student_phone: formData.student_phone,
        parent_name: formData.parent_name,
        parent_relationship: formData.parent_relationship,
        parent_email: formData.parent_email,
        parent_phone: formData.parent_phone,
        parent_consent: formData.parent_consent === "yes",
        nominating_teacher: formData.nominating_teacher,
        teacher_position: formData.teacher_position,
        school_email: formData.school_email,
        school_contact: formData.school_contact,
        formally_nominated: formData.formally_nominated === "yes",
        is_learner_leader: formData.is_learner_leader === "yes",
        leader_roles: formData.leader_roles || null,
        school_activities: formData.school_activities,
        why_edlead: formData.why_edlead,
        leadership_meaning: formData.leadership_meaning,
        school_challenge: formData.school_challenge,
        project_idea: formData.project_idea,
        project_problem: formData.project_problem,
        project_benefit: formData.project_benefit,
        project_team: formData.project_team,
        manage_schoolwork: formData.manage_schoolwork,
        academic_importance: formData.academic_importance,
        willing_to_commit: formData.willing_to_commit === "yes",
        has_device_access: formData.has_device_access === "yes",
        learner_signature: formData.learner_signature,
        learner_signature_date: formData.learner_signature_date,
        parent_signature_name: formData.parent_signature_name,
        parent_signature: formData.parent_signature,
        parent_signature_date: formData.parent_signature_date,
        video_link: formData.video_link || null,
      };

      const { data, error } = await supabase.functions.invoke("submit-application", {
        body: applicationPayload,
      });

      if (error) {
        throw error;
      }

      setApplicationRef(data.applicationId?.slice(0, 8).toUpperCase() || "");
      setIsSubmitted(true);
      
      toast({
        title: "Application Submitted!",
        description: "Thank you for applying to edLEAD. Confirmation emails have been sent.",
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Layout>
        <section className="bg-primary py-16">
          <div className="container text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Application Submitted
            </h1>
          </div>
        </section>
        
        <section className="py-16 bg-muted/30">
          <div className="container max-w-2xl text-center">
            <div className="bg-background rounded-lg p-8 shadow-lg">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Thank You for Applying!</h2>
              <p className="text-muted-foreground mb-6">
                Your application has been successfully submitted. Confirmation emails have been sent to both the student and parent/guardian email addresses.
              </p>
              {applicationRef && (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-sm text-muted-foreground">Application Reference</p>
                  <p className="text-2xl font-mono font-bold">{applicationRef}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Please keep this reference number for your records. Our team will review your application and contact you regarding the next steps.
              </p>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

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
                    <Input 
                      id="fullName" 
                      required 
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input 
                      id="dob" 
                      type="date" 
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => updateField("date_of_birth", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Gender (Optional)</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
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
                    <Label>Grade (7–12) *</Label>
                    <Select value={formData.grade} onValueChange={(v) => updateField("grade", v)} required>
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
                  <Input 
                    id="schoolName" 
                    required 
                    placeholder="Enter your school name"
                    value={formData.school_name}
                    onChange={(e) => updateField("school_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">School Address *</Label>
                  <Textarea 
                    id="schoolAddress" 
                    required 
                    placeholder="Enter school address"
                    value={formData.school_address}
                    onChange={(e) => updateField("school_address", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Province *</Label>
                  <Select value={formData.province} onValueChange={(v) => updateField("province", v)} required>
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
                    <Input 
                      id="studentEmail" 
                      type="email" 
                      required 
                      placeholder="your.email@example.com"
                      value={formData.student_email}
                      onChange={(e) => updateField("student_email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentPhone">Student Mobile Number *</Label>
                    <Input 
                      id="studentPhone" 
                      type="tel" 
                      required 
                      placeholder="e.g. 072 123 4567"
                      value={formData.student_phone}
                      onChange={(e) => updateField("student_phone", e.target.value)}
                    />
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
                    <Input 
                      id="parentName" 
                      required 
                      placeholder="Enter parent/guardian name"
                      value={formData.parent_name}
                      onChange={(e) => updateField("parent_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship to Learner *</Label>
                    <Input 
                      id="relationship" 
                      required 
                      placeholder="e.g. Mother, Father, Guardian"
                      value={formData.parent_relationship}
                      onChange={(e) => updateField("parent_relationship", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Parent/Guardian Email Address *</Label>
                    <Input 
                      id="parentEmail" 
                      type="email" 
                      required 
                      placeholder="parent.email@example.com"
                      value={formData.parent_email}
                      onChange={(e) => updateField("parent_email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Parent/Guardian Mobile Number *</Label>
                    <Input 
                      id="parentPhone" 
                      type="tel" 
                      required 
                      placeholder="e.g. 072 123 4567"
                      value={formData.parent_phone}
                      onChange={(e) => updateField("parent_phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Do you give consent for your child to participate in the edLEAD programme if selected? *</Label>
                  <RadioGroup 
                    value={formData.parent_consent} 
                    onValueChange={(v) => updateField("parent_consent", v)}
                    required
                  >
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
                    <Input 
                      id="nominatingTeacher" 
                      required 
                      placeholder="Enter teacher name"
                      value={formData.nominating_teacher}
                      onChange={(e) => updateField("nominating_teacher", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherPosition">Position *</Label>
                    <Input 
                      id="teacherPosition" 
                      required 
                      placeholder="e.g. Teacher, HOD, Principal"
                      value={formData.teacher_position}
                      onChange={(e) => updateField("teacher_position", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">School Email Address *</Label>
                    <Input 
                      id="schoolEmail" 
                      type="email" 
                      required 
                      placeholder="teacher@school.edu.za"
                      value={formData.school_email}
                      onChange={(e) => updateField("school_email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolContact">Contact Number *</Label>
                    <Input 
                      id="schoolContact" 
                      type="tel" 
                      required 
                      placeholder="e.g. 011 123 4567"
                      value={formData.school_contact}
                      onChange={(e) => updateField("school_contact", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Has this learner been formally nominated by the school? *</Label>
                  <RadioGroup 
                    value={formData.formally_nominated} 
                    onValueChange={(v) => updateField("formally_nominated", v)}
                    required
                  >
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
                  <RadioGroup 
                    value={formData.is_learner_leader} 
                    onValueChange={(v) => updateField("is_learner_leader", v)}
                    required
                  >
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
                    value={formData.leader_roles}
                    onChange={(e) => updateField("leader_roles", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activities">Have you participated in any school or community activities? *</Label>
                  <Textarea 
                    id="activities" 
                    required
                    placeholder="Sports, clubs, volunteering, peer support, etc."
                    rows={4}
                    value={formData.school_activities}
                    onChange={(e) => updateField("school_activities", e.target.value)}
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
                    value={formData.why_edlead}
                    onChange={(e) => updateField("why_edlead", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadershipMeaning">What does leadership mean to you as a learner? * (150–200 words)</Label>
                  <Textarea 
                    id="leadershipMeaning" 
                    required
                    placeholder="Describe what leadership means to you..."
                    rows={6}
                    value={formData.leadership_meaning}
                    onChange={(e) => updateField("leadership_meaning", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolChallenge">Describe a challenge in your school that you would like to help improve. *</Label>
                  <Textarea 
                    id="schoolChallenge" 
                    required
                    placeholder="Identify a challenge and how you would address it..."
                    rows={4}
                    value={formData.school_challenge}
                    onChange={(e) => updateField("school_challenge", e.target.value)}
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
                    value={formData.project_idea}
                    onChange={(e) => updateField("project_idea", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectProblem">What problem does this project address? *</Label>
                  <Textarea 
                    id="projectProblem" 
                    required
                    placeholder="Describe the problem your project aims to solve..."
                    rows={4}
                    value={formData.project_problem}
                    onChange={(e) => updateField("project_problem", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectBenefit">How would this project benefit your school community? *</Label>
                  <Textarea 
                    id="projectBenefit" 
                    required
                    placeholder="Explain the positive impact of your project..."
                    rows={4}
                    value={formData.project_benefit}
                    onChange={(e) => updateField("project_benefit", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectTeam">Who would you work with to make this project successful? *</Label>
                  <Textarea 
                    id="projectTeam" 
                    required
                    placeholder="Learners, teachers, clubs, etc."
                    rows={3}
                    value={formData.project_team}
                    onChange={(e) => updateField("project_team", e.target.value)}
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
                    value={formData.manage_schoolwork}
                    onChange={(e) => updateField("manage_schoolwork", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicImportance">Why is academic excellence important to you as a leader? *</Label>
                  <Textarea 
                    id="academicImportance" 
                    required
                    placeholder="Explain the connection between academics and leadership..."
                    rows={4}
                    value={formData.academic_importance}
                    onChange={(e) => updateField("academic_importance", e.target.value)}
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
                  <Label>Are you willing and able to commit to this for three months? *</Label>
                  <RadioGroup 
                    value={formData.willing_to_commit} 
                    onValueChange={(v) => updateField("willing_to_commit", v)}
                    required
                  >
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
                  <RadioGroup 
                    value={formData.has_device_access} 
                    onValueChange={(v) => updateField("has_device_access", v)}
                    required
                  >
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
                  <Checkbox 
                    id="declaration1" 
                    checked={declarations.declaration1}
                    onCheckedChange={(checked) => 
                      setDeclarations((prev) => ({ ...prev, declaration1: checked as boolean }))
                    }
                  />
                  <Label htmlFor="declaration1" className="font-normal leading-relaxed">
                    I confirm that the information provided is true and correct. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="declaration2" 
                    checked={declarations.declaration2}
                    onCheckedChange={(checked) => 
                      setDeclarations((prev) => ({ ...prev, declaration2: checked as boolean }))
                    }
                  />
                  <Label htmlFor="declaration2" className="font-normal leading-relaxed">
                    I understand that selection into edLEAD is competitive and based on leadership potential, commitment, and school nomination. *
                  </Label>
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
                  <Checkbox 
                    id="parentConsentFinal" 
                    checked={declarations.parentConsentFinal}
                    onCheckedChange={(checked) => 
                      setDeclarations((prev) => ({ ...prev, parentConsentFinal: checked as boolean }))
                    }
                  />
                  <Label htmlFor="parentConsentFinal" className="font-normal leading-relaxed">
                    I give permission for my child to participate in the edLEAD for Student Leaders programme if selected. *
                  </Label>
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
                  <Label htmlFor="videoLink">Short video submission link (Optional)</Label>
                  <Input 
                    id="videoLink" 
                    type="url" 
                    placeholder="YouTube or Google Drive link: Why I should be an edLEAD Captain"
                    value={formData.video_link}
                    onChange={(e) => updateField("video_link", e.target.value)}
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
