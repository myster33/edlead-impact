import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PassportPhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  applicantName?: string;
  error?: string;
}

export function PassportPhotoUpload({ value, onChange, applicantName, error }: PassportPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be less than 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedName = (applicantName || "applicant").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const ext = file.name.split(".").pop();
      const fileName = `${sanitizedName}_${timestamp}.${ext}`;

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from("applicant-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("applicant-photos")
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onChange(publicUrl);
    } catch (err) {
      console.error("Failed to upload photo:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label className={cn(error && "text-destructive")}>
        Passport Photo * <span className="text-muted-foreground font-normal">(Required for acceptance certificate)</span>
      </Label>
      
      <div className="flex items-start gap-4">
        {/* Photo preview area */}
        <div 
          className={cn(
            "relative w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden flex items-center justify-center bg-muted/50",
            error && "border-destructive",
            previewUrl && "border-solid border-primary"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </div>
          ) : previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="Passport photo preview" 
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-2">
              <Camera className="h-8 w-8" />
              <span className="text-xs text-center">No photo</span>
            </div>
          )}
        </div>

        {/* Upload button and instructions */}
        <div className="flex-1 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id="passport-photo-input"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            capture="user"
            onChange={handleFileSelect}
            className="hidden"
            id="passport-camera-input"
          />
          
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Photo Requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Clear, front-facing photo</li>
              <li>Plain background preferred</li>
              <li>Face clearly visible</li>
              <li>JPG, PNG, or WebP format</li>
              <li>Max size: 5MB</li>
            </ul>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
