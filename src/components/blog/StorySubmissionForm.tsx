import { useState } from "react";
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
import { Loader2, PenLine } from "lucide-react";

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

const storySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150, "Title must be less than 150 characters"),
  summary: z.string().min(50, "Summary must be at least 50 characters").max(300, "Summary must be less than 300 characters"),
  content: z.string().min(200, "Your story must be at least 200 characters").max(10000, "Your story must be less than 10000 characters"),
  author_name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  author_school: z.string().min(2, "School name must be at least 2 characters").max(200, "School name must be less than 200 characters"),
  author_province: z.string().min(1, "Please select your province"),
  author_email: z.string().email("Please enter a valid email address"),
});

type StoryFormData = z.infer<typeof storySchema>;

export const StorySubmissionForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
  });

  const onSubmit = async (data: StoryFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("blog_posts").insert({
        title: data.title,
        summary: data.summary,
        content: data.content,
        author_name: data.author_name,
        author_school: data.author_school,
        author_province: data.author_province,
        author_email: data.author_email,
      });

      if (error) throw error;

      toast({
        title: "Story Submitted!",
        description: "Thank you for sharing your story. Our team will review it and get back to you soon.",
      });

      reset();
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
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
