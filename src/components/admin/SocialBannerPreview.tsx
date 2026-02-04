import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image, RefreshCw, Download, Share2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface SocialBannerPreviewProps {
  applicantName: string;
  applicantPhotoUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SocialBannerPreview({
  applicantName,
  applicantPhotoUrl,
  open,
  onOpenChange,
}: SocialBannerPreviewProps) {
  const { toast } = useToast();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBanner = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-banner", {
        body: {
          applicantName,
          applicantPhotoUrl: applicantPhotoUrl || "",
        },
      });

      if (error) throw error;

      if (data?.bannerUrl) {
        setBannerUrl(data.bannerUrl);
        toast({
          title: "Banner Generated",
          description: "Social media banner has been generated successfully.",
        });
      } else {
        throw new Error("No banner URL returned");
      }
    } catch (error) {
      console.error("Error generating banner:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate banner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBanner = () => {
    if (!bannerUrl) return;
    
    const link = document.createElement("a");
    link.href = bannerUrl;
    link.download = `edlead-banner-${applicantName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setBannerUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Social Media Banner
          </DialogTitle>
          <DialogDescription>
            Preview and generate the acceptance banner for {applicantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Banner Preview Area */}
          <div className="border rounded-lg overflow-hidden bg-muted/50">
            <AspectRatio ratio={1}>
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt={`Acceptance banner for ${applicantName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Image className="h-16 w-16 opacity-30" />
                  <p className="text-sm text-center px-4">
                    Click "Generate Banner" to create a shareable<br />acceptance announcement image
                  </p>
                </div>
              )}
            </AspectRatio>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating banner with AI... This may take a moment.</span>
            </div>
          )}

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            This banner will be attached to the approval email for the applicant to share on social media.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {bannerUrl ? (
            <>
              <Button variant="outline" onClick={generateBanner} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button onClick={downloadBanner}>
                <Download className="h-4 w-4 mr-2" />
                Download Banner
              </Button>
            </>
          ) : (
            <Button onClick={generateBanner} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Image className="h-4 w-4 mr-2" />
              )}
              Generate Banner
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
