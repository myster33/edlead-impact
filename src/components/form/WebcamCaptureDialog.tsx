import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Camera, RotateCcw, Check, X } from "lucide-react";

interface WebcamCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export function WebcamCaptureDialog({ open, onOpenChange, onCapture }: WebcamCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setCameraError(null);
    setCapturedImage(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Unable to access camera. Please check permissions or use the upload option instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
    }
    return () => stopCamera();
  }, [open, facingMode, startCamera, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    // Convert data URL to File
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const file = new File([ab], `camera_${Date.now()}.jpg`, { type: mimeString });
    onCapture(file);
    onOpenChange(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <canvas ref={canvasRef} className="hidden" />

          {cameraError ? (
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center p-4">
              <p className="text-sm text-destructive text-center">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full max-w-[320px] aspect-square object-cover rounded-lg"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-[320px] aspect-square object-cover rounded-lg bg-muted"
            />
          )}
        </div>

        <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          {cameraError ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          ) : capturedImage ? (
            <>
              <Button variant="outline" onClick={handleRetake} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <Check className="h-4 w-4" />
                Use Photo
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={toggleFacingMode} size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button onClick={handleCapture} className="gap-2">
                <Camera className="h-4 w-4" />
                Capture
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
