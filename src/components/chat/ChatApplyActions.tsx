import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WebcamCaptureDialog } from "@/components/form/WebcamCaptureDialog";
import { Progress } from "@/components/ui/progress";

interface ChatApplyActionsProps {
  applicationData: Record<string, any>;
  onPhotoUploaded: (url: string) => void;
  onSubmit: () => void;
  isComplete: boolean;
  isSubmitting: boolean;
  collectedCount: number;
  totalRequired: number;
}

export function ChatApplyActions({
  applicationData,
  onPhotoUploaded,
  onSubmit,
  isComplete,
  isSubmitting,
  collectedCount,
  totalRequired,
}: ChatApplyActionsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPhoto = !!applicationData.learner_photo_url;

  const progress = totalRequired > 0 ? Math.round((collectedCount / totalRequired) * 100) : 0;

  const uploadFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be less than 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const name = (applicationData.full_name || "applicant").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `chat_${name}_${timestamp}.${ext}`;

      const { data, error } = await supabase.storage
        .from("applicant-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("applicant-photos")
        .getPublicUrl(data.path);

      onPhotoUploaded(urlData.publicUrl);
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleCameraCapture = (file: File) => {
    uploadFile(file);
  };

  return (
    <div className="px-3 py-2 border-t space-y-2 shrink-0 bg-muted/30">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{progress}%</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Photo buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant={hasPhoto ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSubmitting}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : hasPhoto ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          {hasPhoto ? "Photo ✓" : "Upload Photo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={() => setCameraOpen(true)}
          disabled={isUploading || isSubmitting}
        >
          <Camera className="h-3 w-3" />
          Take Photo
        </Button>

        {/* Submit button */}
        {isComplete && (
          <Button
            size="sm"
            className="gap-1.5 text-xs h-7 ml-auto"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Submit Application
          </Button>
        )}
      </div>

      <WebcamCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
