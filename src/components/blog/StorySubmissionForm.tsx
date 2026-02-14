import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PenLine, X, Image as ImageIcon, Video, Pencil, Check, ChevronLeft, Send } from "lucide-react";
import { PopiaConsentCheckbox, PopiaTermsDialog } from "@/components/shared/PopiaConsentTerms";
import { countryCodes } from "@/lib/country-codes";

const africanCountries = [
  "South Africa",
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Democratic Republic of the Congo",
  "Republic of the Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Príncipe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
];

const southAfricanProvinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const genericRegions = [
  "Eastern",
  "Western",
  "Southern",
  "Central",
  "Northern",
];

export const categories = [
  "Leadership",
  "Impact Stories",
  "Personal Growth",
  "Academic Excellence",
  "Community Projects",
  "Tips & Advice",
];

const storySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150, "Title must be less than 150 characters"),
  summary: z.string().min(50, "Summary must be at least 50 characters").max(300, "Summary must be less than 300 characters"),
  content: z.string().min(200, "Your story must be at least 200 characters").max(10000, "Your story must be less than 10000 characters"),
  author_name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  author_school: z.string().min(2, "School name must be at least 2 characters").max(200, "School name must be less than 200 characters"),
  author_country: z.string().min(1, "Please select your country"),
  author_province: z.string().min(1, "Please select your province"),
  author_email: z.string().email("Please enter a valid email address"),
  category: z.string().min(1, "Please select a category"),
  reference_number: z.string().min(1, "Please enter your Captain Reference Number").max(50, "Reference number must be less than 50 characters"),
  video_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  tags: z.string().optional(),
});

type StoryFormData = z.infer<typeof storySchema>;

const STORY_FIELD_LABELS: Record<string, string> = {
  title: "Story Title",
  category: "Category",
  reference_number: "Captain Reference #",
  author_name: "Full Name",
  author_email: "Email",
  author_phone: "Phone",
  author_school: "School",
  author_country: "Country",
  author_province: "Province / Region",
  summary: "Summary",
  content: "Full Story",
  video_url: "Video Link",
  tags: "Tags",
  featured_image: "Featured Image",
};

const STORY_LONG_TEXT_FIELDS = new Set(["summary", "content"]);
const STORY_SELECT_FIELDS: Record<string, string[]> = {
  category: categories,
};
const STORY_NON_EDITABLE = new Set(["featured_image"]);

function StoryInlineEditor({
  field,
  value,
  onSave,
  onCancel,
  selectOptions,
}: {
  field: string;
  value: any;
  onSave: (val: any) => void;
  onCancel: () => void;
  selectOptions?: string[];
}) {
  const [draft, setDraft] = useState(value ?? "");

  if (selectOptions) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Select value={draft} onValueChange={(v) => onSave(v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (STORY_LONG_TEXT_FIELDS.has(field)) {
    return (
      <div className="mt-1 space-y-1">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="text-sm min-h-[80px]"
          autoFocus
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSave(draft)}>
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 text-sm flex-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onSave(draft)}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface StoryReviewProps {
  data: StoryFormData;
  authorPhone: string;
  imagePreview: string | null;
  onFieldUpdate: (field: string, value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  popiaConsent: boolean;
}

const STORY_REVIEW_FIELDS = [
  "title", "category", "reference_number",
  "author_name", "author_email", "author_phone",
  "author_school", "author_country", "author_province",
  "summary", "content",
  "video_url", "tags", "featured_image",
];

function StoryReview({ data, authorPhone, imagePreview, onFieldUpdate, onBack, onConfirm, isSubmitting, isUploadingImage, popiaConsent }: StoryReviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

  const getValue = (field: string): string => {
    if (field === "author_phone") return authorPhone || "";
    if (field === "featured_image") return imagePreview ? "✅ Uploaded" : "—";
    return (data as any)[field] ?? "";
  };

  const handleSave = (field: string, value: string) => {
    onFieldUpdate(field, value);
    setEditingField(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 border">
        <h3 className="text-base font-semibold mb-3">📋 Review Your Story Submission</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please review your details below. Click the <Pencil className="h-3 w-3 inline" /> icon to edit any field.
        </p>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-2">
            {STORY_REVIEW_FIELDS.map((field) => {
              const val = getValue(field);
              if (!val && field !== "video_url" && field !== "tags") return null;
              const label = STORY_FIELD_LABELS[field] || field;
              const isEditing = editingField === field;
              const canEdit = !STORY_NON_EDITABLE.has(field);
              const isLong = val.length > 80;

              return (
                <div key={field} className="text-sm group py-1 border-b border-border/50 last:border-0">
                  <div className="flex items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground font-medium">{label}: </span>
                      {isEditing ? (
                        <StoryInlineEditor
                          field={field}
                          value={val}
                          onSave={(v) => handleSave(field, v)}
                          onCancel={() => setEditingField(null)}
                          selectOptions={STORY_SELECT_FIELDS[field]}
                        />
                      ) : (
                        <span className={`text-foreground ${isLong ? "block mt-1 text-sm leading-relaxed" : ""}`}>
                          {val || "—"}
                        </span>
                      )}
                    </div>
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => setEditingField(field)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 p-1 rounded hover:bg-muted"
                        aria-label={`Edit ${label}`}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Back to Edit
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isSubmitting || isUploadingImage || !popiaConsent} className="gap-1.5">
          {isSubmitting || isUploadingImage ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isUploadingImage ? "Uploading Image..." : "Submitting..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Confirm & Submit
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export const StorySubmissionForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCountry, setSelectedCountry] = useState<string>("South Africa");
  const [authorPhoneCode, setAuthorPhoneCode] = useState("+27|South Africa");
  const [authorPhone, setAuthorPhone] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
  });

  const getRegionsForCountry = (country: string) => {
    return country === "South Africa" ? southAfricanProvinces : genericRegions;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file type", description: "Please select an image file (JPEG, PNG, etc.).", variant: "destructive" });
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `featured/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("blog-images").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: "Image upload failed", description: "There was an error uploading your image. Your story will be submitted without the image.", variant: "destructive" });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleReviewClick = () => {
    // Trigger validation first, then show review
    handleSubmit(
      () => setShowReview(true),
      () => {
        toast({ title: "Please fix the errors", description: "Some required fields are missing or invalid.", variant: "destructive" });
      }
    )();
  };

  const handleFieldUpdate = (field: string, value: string) => {
    if (field === "author_phone") {
      setAuthorPhone(value);
      return;
    }
    setValue(field as any, value, { shouldValidate: true });
  };

  const doSubmit = async () => {
    const data = getValues();
    if (!popiaConsent) {
      toast({ title: "Consent Required", description: "Please accept the Terms & Conditions to submit your story.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let featuredImageUrl: string | null = null;
      if (selectedImage) featuredImageUrl = await uploadImage(selectedImage);

      const parsedTags = data.tags?.trim()
        ? data.tags.split(",").map(t => t.trim()).filter(Boolean)
        : null;
      const wordCount = data.content.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const { error } = await supabase.from("blog_posts").insert({
        title: data.title,
        summary: data.summary,
        content: data.content,
        author_name: data.author_name,
        author_school: data.author_school,
        author_country: data.author_country,
        author_province: data.author_province,
        author_email: data.author_email,
        author_phone: authorPhone.trim() ? `${authorPhoneCode.split("|")[0]}${authorPhone.trim()}` : null,
        category: data.category,
        reference_number: data.reference_number,
        featured_image_url: featuredImageUrl,
        video_url: data.video_url || null,
        tags: parsedTags,
        reading_time_minutes: readingTime,
      });

      if (error) throw error;

      supabase.functions.invoke("notify-blog-submission", {
        body: {
          title: data.title,
          author_name: data.author_name,
          author_school: data.author_school,
          author_province: data.author_province,
          author_email: data.author_email,
          category: data.category,
          summary: data.summary,
        },
      }).catch((err) => console.error("Failed to send admin notification:", err));

      supabase.functions.invoke("notify-author-submission", {
        body: {
          title: data.title,
          author_name: data.author_name,
          author_email: data.author_email,
          reference_number: data.reference_number,
        },
      }).catch((err) => console.error("Failed to send author confirmation:", err));

      toast({ title: "Story Submitted!", description: "Thank you for sharing your story. Our team will review it and get back to you soon." });

      reset();
      removeImage();
      setAuthorPhone("");
      setAuthorPhoneCode("+27|South Africa");
      setPopiaConsent(false);
      setShowReview(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting story:", error);
      toast({ title: "Submission Failed", description: "There was an error submitting your story. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setShowReview(false); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <PenLine className="h-5 w-5" />
          Submit Your Story
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {showReview ? "Review Your Story" : "Share Your Leadership Story"}
          </DialogTitle>
          <DialogDescription>
            {showReview
              ? "Review the details below before submitting. Click the pencil icon to edit any field."
              : "Tell us about your journey as an edLEAD Captain. Your story could inspire the next generation of leaders."}
          </DialogDescription>
        </DialogHeader>

        {showReview ? (
          <StoryReview
            data={getValues()}
            authorPhone={authorPhone.trim() ? `${authorPhoneCode.split("|")[0]}${authorPhone.trim()}` : ""}
            imagePreview={imagePreview}
            onFieldUpdate={handleFieldUpdate}
            onBack={() => setShowReview(false)}
            onConfirm={doSubmit}
            isSubmitting={isSubmitting}
            isUploadingImage={isUploadingImage}
            popiaConsent={popiaConsent}
          />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleReviewClick(); }} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title" className={errors.title ? "text-destructive" : ""}>Story Title *</Label>
              <Input
                id="title"
                placeholder="Give your story a compelling title"
                className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("title")}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className={errors.category ? "text-destructive" : ""}>Category *</Label>
              <Select onValueChange={(value) => setValue("category", value)}>
                <SelectTrigger className={errors.category ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Select a category for your story" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number" className={errors.reference_number ? "text-destructive" : ""}>Captain Application Reference Number *</Label>
              <Input
                id="reference_number"
                placeholder="e.g., CAP-2024-001"
                className={errors.reference_number ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("reference_number")}
              />
              {errors.reference_number && <p className="text-sm text-destructive">{errors.reference_number.message}</p>}
              <p className="text-xs text-muted-foreground">Enter the reference number from your edLEAD Captain application</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author_name" className={errors.author_name ? "text-destructive" : ""}>Your Full Name *</Label>
                <Input id="author_name" placeholder="Enter your full name" className={errors.author_name ? "border-destructive focus-visible:ring-destructive" : ""} {...register("author_name")} />
                {errors.author_name && <p className="text-sm text-destructive">{errors.author_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="author_email" className={errors.author_email ? "text-destructive" : ""}>Email Address *</Label>
                <Input id="author_email" type="email" placeholder="your.email@example.com" className={errors.author_email ? "border-destructive focus-visible:ring-destructive" : ""} {...register("author_email")} />
                {errors.author_email && <p className="text-sm text-destructive">{errors.author_email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_phone">WhatsApp / Phone Number (Optional)</Label>
              <div className="flex">
                <Select value={authorPhoneCode} onValueChange={setAuthorPhoneCode}>
                  <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countryCodes.map((c) => (
                      <SelectItem key={`${c.country}-${c.code}`} value={`${c.code}|${c.country}`}>
                        {c.flag} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input id="author_phone" type="tel" placeholder="Phone number" className="rounded-l-none" value={authorPhone} onChange={(e) => setAuthorPhone(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">We'll notify you via SMS/WhatsApp when your story is approved</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author_school" className={errors.author_school ? "text-destructive" : ""}>School Name *</Label>
                <Input id="author_school" placeholder="Enter your school name" className={errors.author_school ? "border-destructive focus-visible:ring-destructive" : ""} {...register("author_school")} />
                {errors.author_school && <p className="text-sm text-destructive">{errors.author_school.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="author_country" className={errors.author_country ? "text-destructive" : ""}>Country *</Label>
                <Select onValueChange={(value) => { setValue("author_country", value); setSelectedCountry(value); setValue("author_province", ""); }} defaultValue="South Africa">
                  <SelectTrigger className={errors.author_country ? "border-destructive focus:ring-destructive" : ""}>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {africanCountries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.author_country && <p className="text-sm text-destructive">{errors.author_country.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_province" className={errors.author_province ? "text-destructive" : ""}>Province / Region *</Label>
              <Select onValueChange={(value) => setValue("author_province", value)}>
                <SelectTrigger className={errors.author_province ? "border-destructive focus:ring-destructive" : ""}>
                  <SelectValue placeholder="Select your province / region" />
                </SelectTrigger>
                <SelectContent>
                  {getRegionsForCountry(selectedCountry).map((region) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.author_province && <p className="text-sm text-destructive">{errors.author_province.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Featured Image (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-muted/50 transition-colors rounded-md" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">Click to upload a featured image</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG up to 5MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url" className={`flex items-center gap-2 ${errors.video_url ? "text-destructive" : ""}`}>
                <Video className="h-4 w-4" />
                Video Link (Optional)
              </Label>
              <Input id="video_url" type="url" placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." className={errors.video_url ? "border-destructive focus-visible:ring-destructive" : ""} {...register("video_url")} />
              {errors.video_url && <p className="text-sm text-destructive">{errors.video_url.message}</p>}
              <p className="text-xs text-muted-foreground">Add a link to a YouTube, Vimeo, or other video of your story</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input id="tags" placeholder="e.g., leadership, community, innovation" {...register("tags")} />
              <p className="text-xs text-muted-foreground">Separate tags with commas to help readers find your story</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary" className={errors.summary ? "text-destructive" : ""}>Story Summary *</Label>
              <Textarea id="summary" placeholder="Write a brief summary of your story (50-300 characters)" rows={3} className={errors.summary ? "border-destructive focus-visible:ring-destructive" : ""} {...register("summary")} />
              {errors.summary && <p className="text-sm text-destructive">{errors.summary.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className={errors.content ? "text-destructive" : ""}>Your Full Story *</Label>
              <Textarea id="content" placeholder="Share your leadership journey, the challenges you faced, and the impact you've made..." rows={10} className={errors.content ? "border-destructive focus-visible:ring-destructive" : ""} {...register("content")} />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            </div>

            <PopiaConsentCheckbox checked={popiaConsent} onCheckedChange={setPopiaConsent} variant="story" />
            <div className="text-right">
              <button type="button" onClick={() => setShowTerms(true)} className="text-xs text-primary underline hover:no-underline">
                View full Terms & Conditions
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!popiaConsent}>
                Review & Submit
              </Button>
            </div>
          </form>
        )}

        <PopiaTermsDialog open={showTerms} onOpenChange={setShowTerms} variant="story" />
      </DialogContent>
    </Dialog>
  );
};
