import { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/use-form-validation";
import { FormFieldWrapper } from "@/components/form/FormFieldWrapper";
import { Send, CheckCircle, Circle, Save, Trash2, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const DRAFT_STORAGE_KEY = "edlead-application-draft";

const toISODate = (d: Date) => d.toISOString().split("T")[0];

const getAgeInYears = (dobStr: string) => {
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

const normalizeGradeValue = (value: string) => {
  const match = value?.match(/^grade-(\d{1,2})$/i);
  return match ? `Grade ${match[1]}` : value;
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/\s+/g, "-");

const countryRegions: Record<string, string[]> = {
  "South Africa": [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape"
  ],
  "Botswana": [
    "Central", "Ghanzi", "Kgalagadi", "Kgatleng", "Kweneng",
    "North-East", "North-West", "South-East", "Southern"
  ],
  "Eswatini": [
    "Hhohho", "Lubombo", "Manzini", "Shiselweni"
  ],
  "Lesotho": [
    "Berea", "Butha-Buthe", "Leribe", "Mafeteng", "Maseru",
    "Mohale's Hoek", "Mokhotlong", "Qacha's Nek", "Quthing", "Thaba-Tseka"
  ],
  "Mozambique": [
    "Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo City",
    "Maputo Province", "Nampula", "Niassa", "Sofala", "Tete", "Zambezia"
  ],
  "Namibia": [
    "Erongo", "Hardap", "Karas", "Kavango East", "Kavango West",
    "Khomas", "Kunene", "Ohangwena", "Omaheke", "Omusati",
    "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi"
  ],
  "Zimbabwe": [
    "Bulawayo", "Harare", "Manicaland", "Mashonaland Central",
    "Mashonaland East", "Mashonaland West", "Masvingo",
    "Matabeleland North", "Matabeleland South", "Midlands"
  ],
  "Kenya": [
    "Central", "Coast", "Eastern", "Nairobi", "North Eastern",
    "Nyanza", "Rift Valley", "Western"
  ],
  "Tanzania": [
    "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
    "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
    "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North",
    "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu",
    "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North",
    "Zanzibar South", "Zanzibar West"
  ],
  "Uganda": [
    "Central", "Eastern", "Northern", "Western"
  ],
  "Rwanda": [
    "Eastern", "Kigali", "Northern", "Southern", "Western"
  ],
  "Malawi": [
    "Central", "Northern", "Southern"
  ],
  "Zambia": [
    "Central", "Copperbelt", "Eastern", "Luapula", "Lusaka",
    "Muchinga", "Northern", "North-Western", "Southern", "Western"
  ],
  "Ghana": [
    "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern",
    "Greater Accra", "North East", "Northern", "Oti", "Savannah",
    "Upper East", "Upper West", "Volta", "Western", "Western North"
  ],
  "Nigeria": [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
    "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti",
    "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
    "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
    "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
    "Taraba", "Yobe", "Zamfara"
  ],
  "Ethiopia": [
    "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa",
    "Gambela", "Harari", "Oromia", "Sidama", "Somali", "SNNPR", "Tigray"
  ],
};

const normalizeRegionValue = (country: string, value: string) => {
  const regions = countryRegions[country];
  if (!regions || !value) return value;
  const match = regions.find((r) => slugify(r) === value);
  return match ?? value;
};

const countries = Object.keys(countryRegions).concat(["Other"]);

const countryCodes: Record<string, string> = {
  "South Africa": "+27",
  "Nigeria": "+234",
  "Kenya": "+254",
  "Ghana": "+233",
  "Tanzania": "+255",
  "Uganda": "+256",
  "Zimbabwe": "+263",
  "Botswana": "+267",
  "Namibia": "+264",
  "Zambia": "+260",
  "Mozambique": "+258",
  "Rwanda": "+250",
  "Ethiopia": "+251",
  "Egypt": "+20",
  "Morocco": "+212",
  "Malawi": "+265",
  "Lesotho": "+266",
  "Eswatini": "+268",
};

const grades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

interface FormData {
  full_name: string;
  date_of_birth: string;
  gender: string;
  grade: string;
  school_name: string;
  school_address: string;
  country: string;
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

interface SectionStatus {
  name: string;
  id: string;
  complete: boolean;
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
    country: "South Africa",
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

  const { validateFields, markTouched, getFieldError, hasError, clearError, validateSingleField } = useFormValidation();
  const [hasDraft, setHasDraft] = useState(false);

  const dobMin = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return toISODate(d);
  }, []);

  const dobMax = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return toISODate(d);
  }, []);

  // Load draft from local storage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);

      if (parsed.formData) {
        const fd = parsed.formData as Partial<FormData>;
        const country =
          typeof fd.country === "string" && fd.country.trim() ? fd.country : "South Africa";

        const grade = typeof fd.grade === "string" ? normalizeGradeValue(fd.grade) : "";
        const province = typeof fd.province === "string" ? normalizeRegionValue(country, fd.province) : "";

        setFormData((prev) => ({
          ...prev,
          ...fd,
          country,
          grade,
          province,
        }));
      }

      if (parsed.declarations) setDeclarations(parsed.declarations);
      setHasDraft(true);
      toast({
        title: "Draft Restored",
        description: "Your previously saved progress has been restored.",
      });
    } catch (e) {
      console.error("Failed to parse draft:", e);
    }
  }, []);

  // Auto-save to local storage when form changes
  useEffect(() => {
    const hasAnyData = Object.values(formData).some(v => v !== "");
    if (hasAnyData) {
      const draft = { formData, declarations, savedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setHasDraft(true);
    }
  }, [formData, declarations]);

  const saveDraft = useCallback(() => {
    const draft = { formData, declarations, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setHasDraft(true);
    toast({
      title: "Draft Saved",
      description: "Your progress has been saved. You can return to complete this form later.",
    });
  }, [formData, declarations, toast]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    toast({
      title: "Draft Cleared",
      description: "Your saved draft has been removed.",
    });
  }, [toast]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const validateEmailOnBlur = (field: keyof FormData, label: string) => {
    validateSingleField(field, formData[field], label, "email");
  };

  const validatePhoneOnBlur = (field: keyof FormData, label: string) => {
    validateSingleField(field, formData[field], label, "phone", formData.country);
  };

  const requiredFields = [
    { field: "full_name", label: "Full Name" },
    { field: "date_of_birth", label: "Date of Birth" },
    { field: "grade", label: "Grade", type: "select" as const },
    { field: "school_name", label: "School Name" },
    { field: "school_address", label: "School Address" },
    { field: "country", label: "Country", type: "select" as const },
    ...(formData.country && formData.country !== "Other" && countryRegions[formData.country] ? [{ field: "province", label: "Province/Region", type: "select" as const }] : []),
    { field: "student_email", label: "Student Email", type: "email" as const },
    { field: "student_phone", label: "Student Phone", type: "phone" as const },
    { field: "parent_name", label: "Parent/Guardian Name" },
    { field: "parent_relationship", label: "Relationship to Learner" },
    { field: "parent_email", label: "Parent/Guardian Email", type: "email" as const },
    { field: "parent_phone", label: "Parent/Guardian Phone", type: "phone" as const },
    { field: "parent_consent", label: "Parent Consent", type: "radio" as const },
    { field: "nominating_teacher", label: "Nominating Teacher" },
    { field: "teacher_position", label: "Teacher Position" },
    { field: "school_email", label: "School Email", type: "email" as const },
    { field: "school_contact", label: "School Contact", type: "phone" as const },
    { field: "formally_nominated", label: "School Nomination", type: "radio" as const },
    { field: "is_learner_leader", label: "Learner Leader Status", type: "radio" as const },
    { field: "school_activities", label: "School Activities" },
    { field: "why_edlead", label: "Why edLEAD" },
    { field: "leadership_meaning", label: "Leadership Meaning" },
    { field: "school_challenge", label: "School Challenge" },
    { field: "project_idea", label: "Project Idea" },
    { field: "project_problem", label: "Project Problem" },
    { field: "project_benefit", label: "Project Benefit" },
    { field: "project_team", label: "Project Team" },
    { field: "manage_schoolwork", label: "Manage Schoolwork" },
    { field: "academic_importance", label: "Academic Importance" },
    { field: "willing_to_commit", label: "Programme Commitment", type: "radio" as const },
    { field: "has_device_access", label: "Device Access", type: "radio" as const },
  ];

  const sectionStatuses = useMemo((): SectionStatus[] => {
    return [
      {
        name: "Learner Information",
        id: "section-1",
        complete: !!(formData.full_name && formData.date_of_birth && formData.grade && formData.school_name && formData.school_address && formData.country && (formData.country === "Other" || !countryRegions[formData.country] || formData.province) && formData.student_email && formData.student_phone),
      },
      {
        name: "Parent/Guardian",
        id: "section-2",
        complete: !!(formData.parent_name && formData.parent_relationship && formData.parent_email && formData.parent_phone && formData.parent_consent),
      },
      {
        name: "School Nomination",
        id: "section-3",
        complete: !!(formData.nominating_teacher && formData.teacher_position && formData.school_email && formData.school_contact && formData.formally_nominated),
      },
      {
        name: "Leadership Experience",
        id: "section-4",
        complete: !!(formData.is_learner_leader && formData.school_activities),
      },
      {
        name: "Motivation & Values",
        id: "section-5",
        complete: !!(formData.why_edlead && formData.leadership_meaning && formData.school_challenge),
      },
      {
        name: "Impact Project",
        id: "section-6",
        complete: !!(formData.project_idea && formData.project_problem && formData.project_benefit && formData.project_team),
      },
      {
        name: "Academic Commitment",
        id: "section-7",
        complete: !!(formData.manage_schoolwork && formData.academic_importance),
      },
      {
        name: "Programme Commitment",
        id: "section-8",
        complete: !!(formData.willing_to_commit && formData.has_device_access),
      },
      {
        name: "Declarations",
        id: "section-9",
        complete: !!(declarations.declaration1 && declarations.declaration2 && declarations.parentConsentFinal),
      },
    ];
  }, [formData, declarations]);

  const completedSections = sectionStatuses.filter(s => s.complete).length;
  const totalSections = sectionStatuses.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedFormData = {
      ...formData,
      grade: normalizeGradeValue(formData.grade),
      province: normalizeRegionValue(formData.country, formData.province),
    };

    // Client-side guardrails to match backend expectations
    if (normalizedFormData.grade && !grades.includes(normalizedFormData.grade)) {
      toast({
        title: "Please select a valid grade",
        description: "Choose a grade between Grade 7 and Grade 12.",
        variant: "destructive",
      });

      const el = document.getElementById("grade");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.();
      return;
    }

    if (normalizedFormData.date_of_birth) {
      const age = getAgeInYears(normalizedFormData.date_of_birth);
      if (age < 10 || age > 25) {
        toast({
          title: "Date of birth out of range",
          description: "Applicant age must be between 10 and 25 years.",
          variant: "destructive",
        });

        const el = document.getElementById("date_of_birth");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement | null)?.focus?.();
        return;
      }
    }

    // Validate all required fields
    const allFieldsData = {
      ...normalizedFormData,
      declaration1: declarations.declaration1,
      declaration2: declarations.declaration2,
      parentConsentFinal: declarations.parentConsentFinal,
    };

    const allRequiredFields = [
      ...requiredFields,
      { field: "declaration1", label: "Declaration 1", type: "checkbox" as const },
      { field: "declaration2", label: "Declaration 2", type: "checkbox" as const },
      { field: "parentConsentFinal", label: "Parent Consent", type: "checkbox" as const },
    ];

    const { isValid, firstErrorField } = validateFields(allFieldsData, allRequiredFields);

    if (!isValid) {
      toast({
        title: "Please Complete All Required Fields",
        description: "Some required fields are missing. Please review the form.",
        variant: "destructive",
      });
      
      // Scroll to first error
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationPayload = {
        full_name: normalizedFormData.full_name,
        date_of_birth: normalizedFormData.date_of_birth,
        gender: normalizedFormData.gender || null,
        grade: normalizedFormData.grade,
        school_name: normalizedFormData.school_name,
        school_address: normalizedFormData.school_address,
        country: normalizedFormData.country,
        province:
          normalizedFormData.country !== "Other" && countryRegions[normalizedFormData.country]
            ? normalizedFormData.province
            : "",
        student_email: normalizedFormData.student_email,
        student_phone: normalizedFormData.student_phone,
        parent_name: normalizedFormData.parent_name,
        parent_relationship: normalizedFormData.parent_relationship,
        parent_email: normalizedFormData.parent_email,
        parent_phone: normalizedFormData.parent_phone,
        parent_consent: normalizedFormData.parent_consent === "yes",
        nominating_teacher: normalizedFormData.nominating_teacher,
        teacher_position: normalizedFormData.teacher_position,
        school_email: normalizedFormData.school_email,
        school_contact: normalizedFormData.school_contact,
        formally_nominated: normalizedFormData.formally_nominated === "yes",
        is_learner_leader: normalizedFormData.is_learner_leader === "yes",
        leader_roles: normalizedFormData.leader_roles || null,
        school_activities: normalizedFormData.school_activities,
        why_edlead: normalizedFormData.why_edlead,
        leadership_meaning: normalizedFormData.leadership_meaning,
        school_challenge: normalizedFormData.school_challenge,
        project_idea: normalizedFormData.project_idea,
        project_problem: normalizedFormData.project_problem,
        project_benefit: normalizedFormData.project_benefit,
        project_team: normalizedFormData.project_team,
        manage_schoolwork: normalizedFormData.manage_schoolwork,
        academic_importance: normalizedFormData.academic_importance,
        willing_to_commit: normalizedFormData.willing_to_commit === "yes",
        has_device_access: normalizedFormData.has_device_access === "yes",
        learner_signature: normalizedFormData.full_name,
        learner_signature_date: toISODate(new Date()),
        parent_signature_name: normalizedFormData.parent_name,
        parent_signature: normalizedFormData.parent_name,
        parent_signature_date: toISODate(new Date()),
        video_link: normalizedFormData.video_link || null,
      };

      const { data, error } = await supabase.functions.invoke("submit-application", {
        body: applicationPayload,
      });

      if (error) {
        throw error;
      }

      setApplicationRef(data.applicationId?.slice(0, 8).toUpperCase() || "");
      setIsSubmitted(true);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      toast({
        title: "Application Submitted!",
        description: "Thank you for applying to edLEAD. Confirmation emails have been sent.",
      });
    } catch (error: any) {
      console.error("Submission error:", error);

      let description =
        error?.message ||
        "There was an error submitting your application. Please try again.";

      // Try to surface validation details from the backend function response
      try {
        const response: Response | undefined =
          typeof Response !== "undefined" && error?.context instanceof Response
            ? error.context
            : error?.context?.response;

        if (response) {
          const body: any = await response.clone().json().catch(async () => {
            const text = await response.clone().text();
            try {
              return text ? JSON.parse(text) : null;
            } catch {
              return text ? { error: text } : null;
            }
          });

          if (body?.details && Array.isArray(body.details) && body.details.length) {
            description = body.details.slice(0, 3).join(" • ");
          } else if (body?.error) {
            description = String(body.error);
          }
        }
      } catch {
        // ignore parsing errors
      }

      toast({
        title: "Submission Failed",
        description,
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

      {/* Progress Indicator - Sticky on md+ screens, positioned below navbar */}
      <section className="py-6 bg-background border-b md:sticky md:top-[7.5rem] md:z-40 md:shadow-sm">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Application Progress</span>
            <div className="flex items-center gap-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                asChild
                className="gap-1"
              >
                <Link to="/check-status">
                  <Search className="h-4 w-4" />
                  Check Status
                </Link>
              </Button>
              {hasDraft && (
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={saveDraft}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Draft?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your saved draft. All your progress will be lost and cannot be recovered.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearDraft} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Clear Draft
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{completedSections} of {totalSections} sections complete</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(completedSections / totalSections) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {sectionStatuses.map((section, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  const element = document.getElementById(section.id);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="flex flex-col items-center text-center hover:opacity-80 transition-opacity cursor-pointer"
              >
                {section.complete ? (
                  <CheckCircle className="h-5 w-5 text-primary mb-1" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mb-1" />
                )}
                <span className={`text-xs ${section.complete ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {section.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Learner Information */}
            <Card id="section-1">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 1: Learner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("full_name")}>
                    <Label htmlFor="full_name">Full Name (as per school records) *</Label>
                    <Input 
                      id="full_name" 
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      onBlur={() => markTouched("full_name")}
                      className={cn(hasError("full_name") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("date_of_birth")}>
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input 
                      id="date_of_birth" 
                      type="date" 
                      min={dobMin}
                      max={dobMax}
                      value={formData.date_of_birth}
                      onChange={(e) => updateField("date_of_birth", e.target.value)}
                      onBlur={() => markTouched("date_of_birth")}
                      className={cn(hasError("date_of_birth") && "border-destructive")}
                    />
                  </FormFieldWrapper>
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
                  <FormFieldWrapper error={getFieldError("grade")}>
                    <Label>Grade (7–12) *</Label>
                    <Select value={formData.grade} onValueChange={(v) => updateField("grade", v)}>
                      <SelectTrigger id="grade" className={cn(hasError("grade") && "border-destructive")}>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormFieldWrapper>
                </div>

                <FormFieldWrapper error={getFieldError("school_name")}>
                  <Label htmlFor="school_name">School Name *</Label>
                  <Input 
                    id="school_name" 
                    placeholder="Enter your school name"
                    value={formData.school_name}
                    onChange={(e) => updateField("school_name", e.target.value)}
                    onBlur={() => markTouched("school_name")}
                    className={cn(hasError("school_name") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("school_address")}>
                  <Label htmlFor="school_address">School Address *</Label>
                  <Textarea 
                    id="school_address" 
                    placeholder="Enter school address"
                    value={formData.school_address}
                    onChange={(e) => updateField("school_address", e.target.value)}
                    onBlur={() => markTouched("school_address")}
                    className={cn(hasError("school_address") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("country")}>
                  <Label>Country *</Label>
                  <Select value={formData.country} onValueChange={(v) => {
                    updateField("country", v);
                    if (v !== "South Africa") {
                      updateField("province", "");
                    }
                  }}>
                    <SelectTrigger id="country" className={cn(hasError("country") && "border-destructive")}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormFieldWrapper>

                {formData.country && formData.country !== "Other" && countryRegions[formData.country] && (
                  <FormFieldWrapper error={getFieldError("province")}>
                    <Label>Province/Region *</Label>
                    <Select value={formData.province} onValueChange={(v) => updateField("province", v)}>
                      <SelectTrigger id="province" className={cn(hasError("province") && "border-destructive")}>
                        <SelectValue placeholder="Select province/region" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryRegions[formData.country].map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormFieldWrapper>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("student_email")}>
                    <Label htmlFor="student_email">Student Email Address *</Label>
                    <Input 
                      id="student_email" 
                      type="email" 
                      placeholder="your.email@example.com"
                      value={formData.student_email}
                      onChange={(e) => updateField("student_email", e.target.value)}
                      onBlur={() => validateEmailOnBlur("student_email", "Student Email")}
                      className={cn(hasError("student_email") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("student_phone")}>
                    <Label htmlFor="student_phone">Student Mobile Number *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                        {countryCodes[formData.country] || "+"}
                      </span>
                      <Input 
                        id="student_phone" 
                        type="tel" 
                        placeholder="e.g. 0721234567"
                        value={formData.student_phone}
                        onChange={(e) => updateField("student_phone", e.target.value)}
                        onBlur={() => validatePhoneOnBlur("student_phone", "Student Phone")}
                        className={cn("rounded-l-none", hasError("student_phone") && "border-destructive")}
                      />
                    </div>
                  </FormFieldWrapper>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Parent/Guardian Information */}
            <Card id="section-2">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 2: Parent / Guardian Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("parent_name")}>
                    <Label htmlFor="parent_name">Parent/Guardian Full Name *</Label>
                    <Input 
                      id="parent_name" 
                      placeholder="Enter parent/guardian name"
                      value={formData.parent_name}
                      onChange={(e) => updateField("parent_name", e.target.value)}
                      onBlur={() => markTouched("parent_name")}
                      className={cn(hasError("parent_name") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("parent_relationship")}>
                    <Label htmlFor="parent_relationship">Relationship to Learner *</Label>
                    <Input 
                      id="parent_relationship" 
                      placeholder="e.g. Mother, Father, Guardian"
                      value={formData.parent_relationship}
                      onChange={(e) => updateField("parent_relationship", e.target.value)}
                      onBlur={() => markTouched("parent_relationship")}
                      className={cn(hasError("parent_relationship") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("parent_email")}>
                    <Label htmlFor="parent_email">Parent/Guardian Email Address *</Label>
                    <Input 
                      id="parent_email" 
                      type="email" 
                      placeholder="parent.email@example.com"
                      value={formData.parent_email}
                      onChange={(e) => updateField("parent_email", e.target.value)}
                      onBlur={() => validateEmailOnBlur("parent_email", "Parent/Guardian Email")}
                      className={cn(hasError("parent_email") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("parent_phone")}>
                    <Label htmlFor="parent_phone">Parent/Guardian Mobile Number *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                        {countryCodes[formData.country] || "+"}
                      </span>
                      <Input 
                        id="parent_phone" 
                        type="tel" 
                        placeholder="e.g. 0721234567"
                        value={formData.parent_phone}
                        onChange={(e) => updateField("parent_phone", e.target.value)}
                        onBlur={() => validatePhoneOnBlur("parent_phone", "Parent/Guardian Phone")}
                        className={cn("rounded-l-none", hasError("parent_phone") && "border-destructive")}
                      />
                    </div>
                  </FormFieldWrapper>
                </div>

                <FormFieldWrapper error={getFieldError("parent_consent")}>
                  <Label>Do you give consent for your child to participate in the edLEAD programme if selected? *</Label>
                  <RadioGroup 
                    id="parent_consent"
                    value={formData.parent_consent} 
                    onValueChange={(v) => updateField("parent_consent", v)}
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
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 3: School Nomination Details */}
            <Card id="section-3">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 3: School Nomination Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("nominating_teacher")}>
                    <Label htmlFor="nominating_teacher">Name of Nominating Teacher / School Representative *</Label>
                    <Input 
                      id="nominating_teacher" 
                      placeholder="Enter teacher name"
                      value={formData.nominating_teacher}
                      onChange={(e) => updateField("nominating_teacher", e.target.value)}
                      onBlur={() => markTouched("nominating_teacher")}
                      className={cn(hasError("nominating_teacher") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("teacher_position")}>
                    <Label htmlFor="teacher_position">Position *</Label>
                    <Input 
                      id="teacher_position" 
                      placeholder="e.g. Teacher, HOD, Principal"
                      value={formData.teacher_position}
                      onChange={(e) => updateField("teacher_position", e.target.value)}
                      onBlur={() => markTouched("teacher_position")}
                      className={cn(hasError("teacher_position") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormFieldWrapper error={getFieldError("school_email")}>
                    <Label htmlFor="school_email">School Email Address *</Label>
                    <Input 
                      id="school_email" 
                      type="email" 
                      placeholder="teacher@school.edu.za"
                      value={formData.school_email}
                      onChange={(e) => updateField("school_email", e.target.value)}
                      onBlur={() => validateEmailOnBlur("school_email", "School Email")}
                      className={cn(hasError("school_email") && "border-destructive")}
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper error={getFieldError("school_contact")}>
                    <Label htmlFor="school_contact">Contact Number *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                        {countryCodes[formData.country] || "+"}
                      </span>
                      <Input 
                        id="school_contact" 
                        type="tel" 
                        placeholder="e.g. 0111234567"
                        value={formData.school_contact}
                        onChange={(e) => updateField("school_contact", e.target.value)}
                        onBlur={() => validatePhoneOnBlur("school_contact", "School Contact")}
                        className={cn("rounded-l-none", hasError("school_contact") && "border-destructive")}
                      />
                    </div>
                  </FormFieldWrapper>
                </div>

                <FormFieldWrapper error={getFieldError("formally_nominated")}>
                  <Label>Has this learner been formally nominated by the school? *</Label>
                  <RadioGroup 
                    id="formally_nominated"
                    value={formData.formally_nominated} 
                    onValueChange={(v) => updateField("formally_nominated", v)}
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
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 4: Leadership Experience & Involvement */}
            <Card id="section-4">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 4: Leadership Experience & Involvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormFieldWrapper error={getFieldError("is_learner_leader")}>
                  <Label>Are you currently a learner leader? (e.g. Prefect, RCL, Class Monitor, Club Leader) *</Label>
                  <RadioGroup 
                    id="is_learner_leader"
                    value={formData.is_learner_leader} 
                    onValueChange={(v) => updateField("is_learner_leader", v)}
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
                </FormFieldWrapper>

                <div className="space-y-2">
                  <Label htmlFor="leader_roles">If yes, please describe your role(s):</Label>
                  <Textarea 
                    id="leader_roles" 
                    placeholder="Describe your leadership role(s) and responsibilities..."
                    rows={4}
                    value={formData.leader_roles}
                    onChange={(e) => updateField("leader_roles", e.target.value)}
                  />
                </div>

                <FormFieldWrapper error={getFieldError("school_activities")}>
                  <Label htmlFor="school_activities">Have you participated in any school or community activities? *</Label>
                  <Textarea 
                    id="school_activities" 
                    placeholder="Sports, clubs, volunteering, peer support, etc."
                    rows={4}
                    value={formData.school_activities}
                    onChange={(e) => updateField("school_activities", e.target.value)}
                    onBlur={() => markTouched("school_activities")}
                    className={cn(hasError("school_activities") && "border-destructive")}
                  />
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 5: Motivation & Values */}
            <Card id="section-5">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 5: Motivation & Values
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormFieldWrapper error={getFieldError("why_edlead")}>
                  <Label htmlFor="why_edlead">Why do you want to become an edLEAD Captain? * (200–300 words)</Label>
                  <Textarea 
                    id="why_edlead" 
                    placeholder="Share your motivation for joining edLEAD..."
                    rows={8}
                    value={formData.why_edlead}
                    onChange={(e) => updateField("why_edlead", e.target.value)}
                    onBlur={() => markTouched("why_edlead")}
                    className={cn(hasError("why_edlead") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("leadership_meaning")}>
                  <Label htmlFor="leadership_meaning">What does leadership mean to you as a learner? * (150–200 words)</Label>
                  <Textarea 
                    id="leadership_meaning" 
                    placeholder="Describe what leadership means to you..."
                    rows={6}
                    value={formData.leadership_meaning}
                    onChange={(e) => updateField("leadership_meaning", e.target.value)}
                    onBlur={() => markTouched("leadership_meaning")}
                    className={cn(hasError("leadership_meaning") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("school_challenge")}>
                  <Label htmlFor="school_challenge">Describe a challenge in your school that you would like to help improve. *</Label>
                  <Textarea 
                    id="school_challenge" 
                    placeholder="Identify a challenge and how you would address it..."
                    rows={4}
                    value={formData.school_challenge}
                    onChange={(e) => updateField("school_challenge", e.target.value)}
                    onBlur={() => markTouched("school_challenge")}
                    className={cn(hasError("school_challenge") && "border-destructive")}
                  />
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 6: School Impact Project */}
            <Card id="section-6">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 6: School Impact Project (Core Selection Section)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormFieldWrapper error={getFieldError("project_idea")}>
                  <Label htmlFor="project_idea">If selected, what project would you like to lead at your school? *</Label>
                  <Textarea 
                    id="project_idea" 
                    placeholder="Example: improving discipline, school safety, cleanliness, peer support, peacebuilding, study culture..."
                    rows={4}
                    value={formData.project_idea}
                    onChange={(e) => updateField("project_idea", e.target.value)}
                    onBlur={() => markTouched("project_idea")}
                    className={cn(hasError("project_idea") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("project_problem")}>
                  <Label htmlFor="project_problem">What problem does this project address? *</Label>
                  <Textarea 
                    id="project_problem" 
                    placeholder="Describe the problem your project aims to solve..."
                    rows={4}
                    value={formData.project_problem}
                    onChange={(e) => updateField("project_problem", e.target.value)}
                    onBlur={() => markTouched("project_problem")}
                    className={cn(hasError("project_problem") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("project_benefit")}>
                  <Label htmlFor="project_benefit">How would this project benefit your school community? *</Label>
                  <Textarea 
                    id="project_benefit" 
                    placeholder="Explain the positive impact of your project..."
                    rows={4}
                    value={formData.project_benefit}
                    onChange={(e) => updateField("project_benefit", e.target.value)}
                    onBlur={() => markTouched("project_benefit")}
                    className={cn(hasError("project_benefit") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("project_team")}>
                  <Label htmlFor="project_team">Who would you work with to make this project successful? *</Label>
                  <Textarea 
                    id="project_team" 
                    placeholder="Learners, teachers, clubs, etc."
                    rows={3}
                    value={formData.project_team}
                    onChange={(e) => updateField("project_team", e.target.value)}
                    onBlur={() => markTouched("project_team")}
                    className={cn(hasError("project_team") && "border-destructive")}
                  />
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 7: Academic Commitment */}
            <Card id="section-7">
              <CardHeader>
                <CardTitle className="text-xl text-primary">
                  Section 7: Academic Commitment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormFieldWrapper error={getFieldError("manage_schoolwork")}>
                  <Label htmlFor="manage_schoolwork">How do you manage your schoolwork and responsibilities? *</Label>
                  <Textarea 
                    id="manage_schoolwork" 
                    placeholder="Describe how you balance academics with other activities..."
                    rows={4}
                    value={formData.manage_schoolwork}
                    onChange={(e) => updateField("manage_schoolwork", e.target.value)}
                    onBlur={() => markTouched("manage_schoolwork")}
                    className={cn(hasError("manage_schoolwork") && "border-destructive")}
                  />
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("academic_importance")}>
                  <Label htmlFor="academic_importance">Why is academic excellence important to you as a leader? *</Label>
                  <Textarea 
                    id="academic_importance" 
                    placeholder="Explain the connection between academics and leadership..."
                    rows={4}
                    value={formData.academic_importance}
                    onChange={(e) => updateField("academic_importance", e.target.value)}
                    onBlur={() => markTouched("academic_importance")}
                    className={cn(hasError("academic_importance") && "border-destructive")}
                  />
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 8: Programme Commitment */}
            <Card id="section-8">
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

                <FormFieldWrapper error={getFieldError("willing_to_commit")}>
                  <Label>Are you willing and able to commit to this for three months? *</Label>
                  <RadioGroup 
                    id="willing_to_commit"
                    value={formData.willing_to_commit} 
                    onValueChange={(v) => updateField("willing_to_commit", v)}
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
                </FormFieldWrapper>

                <FormFieldWrapper error={getFieldError("has_device_access")}>
                  <Label>Do you have access to a smartphone, tablet, or computer for online sessions? *</Label>
                  <RadioGroup 
                    id="has_device_access"
                    value={formData.has_device_access} 
                    onValueChange={(v) => updateField("has_device_access", v)}
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
                </FormFieldWrapper>
              </CardContent>
            </Card>

            {/* Section 9: Declaration */}
            <Card id="section-9">
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
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
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
