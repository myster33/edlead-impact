import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check, Key, RefreshCw, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface TwoFactorSetupProps {
  onStatusChange?: (enabled: boolean) => void;
  adminUserId?: string;
}

// Generate a random backup code
const generateBackupCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 4) + "-" + code.slice(4);
};

// Hash a backup code
const hashCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase().replace(/-/g, ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export function TwoFactorSetup({ onStatusChange, adminUserId }: TwoFactorSetupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  useEffect(() => {
    if (adminUserId && mfaEnabled) {
      fetchBackupCodesCount();
    }
  }, [adminUserId, mfaEnabled]);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedFactors = data.totp.filter(f => f.status === "verified");
      setMfaEnabled(verifiedFactors.length > 0);
      onStatusChange?.(verifiedFactors.length > 0);
    } catch (error) {
      console.error("Error checking MFA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackupCodesCount = async () => {
    if (!adminUserId) return;
    
    try {
      const { data, error } = await supabase
        .from("admin_backup_codes")
        .select("id")
        .eq("admin_user_id", adminUserId)
        .is("used_at", null);

      if (!error && data) {
        setBackupCodesCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching backup codes count:", error);
    }
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      setEnrollmentData({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start 2FA enrollment",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const generateAndSaveBackupCodes = async (): Promise<string[]> => {
    if (!adminUserId) return [];

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(generateBackupCode());
    }

    // Delete existing backup codes
    await supabase
      .from("admin_backup_codes")
      .delete()
      .eq("admin_user_id", adminUserId);

    // Hash and save new codes
    const codeRecords = await Promise.all(
      codes.map(async (code) => ({
        admin_user_id: adminUserId,
        code_hash: await hashCode(code),
      }))
    );

    const { error } = await supabase
      .from("admin_backup_codes")
      .insert(codeRecords);

    if (error) {
      console.error("Error saving backup codes:", error);
      throw error;
    }

    return codes;
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollmentData.id,
        code: verifyCode,
      });

      if (error) throw error;

      // Generate backup codes
      const codes = await generateAndSaveBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
      
      setMfaEnabled(true);
      setEnrollmentData(null);
      setVerifyCode("");
      onStatusChange?.(true);
      setBackupCodesCount(codes.length);

      toast({
        title: "2FA Enabled",
        description: "Save your backup codes - they won't be shown again!",
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disableMfa = async () => {
    if (disableCode.length !== 6) return;

    setIsDisabling(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.totp.find(f => f.status === "verified");

      if (!verifiedFactor) throw new Error("No verified factor found");

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.id,
        code: disableCode,
      });

      if (verifyError) throw verifyError;

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (unenrollError) throw unenrollError;

      // Delete backup codes
      if (adminUserId) {
        await supabase
          .from("admin_backup_codes")
          .delete()
          .eq("admin_user_id", adminUserId);
      }

      setMfaEnabled(false);
      setShowDisableDialog(false);
      setDisableCode("");
      setBackupCodesCount(0);
      onStatusChange?.(false);

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA. Check your code.",
        variant: "destructive",
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setIsRegeneratingCodes(true);
    try {
      const codes = await generateAndSaveBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
      setShowRegenerateDialog(false);
      setBackupCodesCount(codes.length);

      toast({
        title: "Backup Codes Regenerated",
        description: "Your old codes are now invalid. Save the new ones!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate backup codes.",
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const copySecret = async () => {
    if (enrollmentData?.secret) {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyBackupCodes = async () => {
    const codesText = backupCodes.join("\n");
    await navigator.clipboard.writeText(codesText);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard.",
    });
  };

  const downloadBackupCodes = () => {
    const codesText = `edLEAD Admin 2FA Backup Codes\n${"=".repeat(30)}\n\nGenerated: ${new Date().toLocaleString()}\n\nKeep these codes safe. Each can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}\n\nIMPORTANT: Store these codes securely!`;
    
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edlead-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cancelEnrollment = async () => {
    if (enrollmentData) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id });
      } catch (error) {
        // Ignore error if factor wasn't fully enrolled
      }
    }
    setEnrollmentData(null);
    setVerifyCode("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code from your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">2FA is enabled</span>
              </div>

              {/* Backup codes info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {backupCodesCount} backup codes remaining
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
            </div>
          ) : enrollmentData ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">1. Scan this QR code with your authenticator app:</p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={enrollmentData.qrCode} 
                    alt="2FA QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Or manually enter this secret key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-code">2. Enter the 6-digit code from your app:</Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={verifyEnrollment}
                  disabled={verifyCode.length !== 6 || isVerifying}
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
                <Button variant="outline" onClick={cancelEnrollment}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">2FA is not enabled</span>
              </div>
              <Button onClick={startEnrollment} disabled={isEnrolling}>
                {isEnrolling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              These codes will not be shown again. Make sure to save them now!
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="p-2 bg-background rounded text-center">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyBackupCodes} className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" onClick={downloadBackupCodes} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          <Button onClick={() => setShowBackupCodes(false)}>
            I've saved my codes
          </Button>
        </DialogContent>
      </Dialog>

      {/* Regenerate Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes?</DialogTitle>
            <DialogDescription>
              This will invalidate all existing backup codes and generate 10 new ones.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              onClick={regenerateBackupCodes}
              disabled={isRegeneratingCodes}
              className="flex-1"
            >
              {isRegeneratingCodes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Regenerate Codes"
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to disable 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={disableMfa}
                disabled={disableCode.length !== 6 || isDisabling}
                className="flex-1"
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  "Disable 2FA"
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowDisableDialog(false);
                setDisableCode("");
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
