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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PenLine, X, Image as ImageIcon, Video } from "lucide-react";

const provinces = [
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
  author_province: z.string().min(1, "Please select your province"),
  author_email: z.string().email("Please enter a valid email address"),
  category: z.string().min(1, "Please select a category"),
  reference_number: z.string().min(1, "Please enter your Captain Reference Number").max(50, "Reference number must be less than 50 characters"),
  video_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type StoryFormData = z.infer<typeof storySchema>;

export const StorySubmissionForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.).",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Image upload failed",
        description: "There was an error uploading your image. Your story will be submitted without the image.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSubmit = async (data: StoryFormData) => {
    setIsSubmitting(true);
    try {
      let featuredImageUrl: string | null = null;

      // Upload image if selected
      if (selectedImage) {
        featuredImageUrl = await uploadImage(selectedImage);
      }

      const { error } = await supabase.from("blog_posts").insert({
        title: data.title,
        summary: data.summary,
        content: data.content,
        author_name: data.author_name,
        author_school: data.author_school,
        author_province: data.author_province,
        author_email: data.author_email,
        category: data.category,
        reference_number: data.reference_number,
        featured_image_url: featuredImageUrl,
        video_url: data.video_url || null,
      });

      if (error) throw error;

      // Notify admins about the new submission (fire and forget)
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
      }).catch((err) => {
        console.error("Failed to send admin notification:", err);
      });

      toast({
        title: "Story Submitted!",
        description: "Thank you for sharing your story. Our team will review it and get back to you soon.",
      });

      reset();
      removeImage();
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting story:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <PenLine className="h-5 w-5" />
          Submit Your Story
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Share Your Leadership Story</DialogTitle>
          <DialogDescription>
            Tell us about your journey as an edLEAD Captain. Your story could inspire the next generation of leaders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Story Title *</Label>
            <Input
              id="title"
              placeholder="Give your story a compelling title"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(value) => setValue("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category for your story" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Captain Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Captain Application Reference Number *</Label>
            <Input
              id="reference_number"
              placeholder="e.g., CAP-2024-001"
              {...register("reference_number")}
            />
            {errors.reference_number && (
              <p className="text-sm text-destructive">{errors.reference_number.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the reference number from your edLEAD Captain application
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author_name">Your Full Name *</Label>
              <Input
                id="author_name"
                placeholder="Enter your full name"
                {...register("author_name")}
              />
              {errors.author_name && (
                <p className="text-sm text-destructive">{errors.author_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_email">Email Address *</Label>
              <Input
                id="author_email"
                type="email"
                placeholder="your.email@example.com"
                {...register("author_email")}
              />
              {errors.author_email && (
                <p className="text-sm text-destructive">{errors.author_email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author_school">School Name *</Label>
              <Input
                id="author_school"
                placeholder="Enter your school name"
                {...register("author_school")}
              />
              {errors.author_school && (
                <p className="text-sm text-destructive">{errors.author_school.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author_province">Province *</Label>
              <Select onValueChange={(value) => setValue("author_province", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.author_province && (
                <p className="text-sm text-destructive">{errors.author_province.message}</p>
              )}
            </div>
          </div>

          {/* Featured Image Upload */}
          <div className="space-y-2">
            <Label>Featured Image (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-muted/50 transition-colors rounded-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload a featured image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG up to 5MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>

          {/* Video Link (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="video_url" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Link (Optional)
            </Label>
            <Input
              id="video_url"
              type="url"
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              {...register("video_url")}
            />
            {errors.video_url && (
              <p className="text-sm text-destructive">{errors.video_url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Add a link to a YouTube, Vimeo, or other video of your story
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Story Summary *</Label>
            <Textarea
              id="summary"
              placeholder="Write a brief summary of your story (50-300 characters)"
              rows={3}
              {...register("summary")}
            />
            {errors.summary && (
              <p className="text-sm text-destructive">{errors.summary.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Your Full Story *</Label>
            <Textarea
              id="content"
              placeholder="Share your leadership journey, the challenges you faced, and the impact you've made..."
              rows={10}
              {...register("content")}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting || isUploadingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingImage ? "Uploading Image..." : "Submitting..."}
                </>
              ) : (
                "Submit Story"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
