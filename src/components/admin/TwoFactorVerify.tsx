import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ArrowLeft, Key } from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorVerifyProps {
  factorId: string;
  adminUserId?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ factorId, adminUserId, onVerified, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState("authenticator");
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) throw verifyError;

      onVerified();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackupCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backupCode.length < 8 || !adminUserId) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-backup-code", {
        body: {
          code: backupCode,
          adminUserId,
        },
      });

      if (error) throw error;

      if (!data.valid) {
        throw new Error(data.error || "Invalid backup code");
      }

      toast({
        title: "Backup Code Used",
        description: `${data.remainingCodes} backup codes remaining.`,
      });

      onVerified();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid backup code. Please try again.",
        variant: "destructive",
      });
      setBackupCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex justify-center mb-2">
            <img 
              src={edleadLogo} 
              alt="edLEAD Logo" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Verify your identity to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="authenticator" className="gap-2">
                <Shield className="h-4 w-4" />
                Authenticator
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-2" disabled={!adminUserId}>
                <Key className="h-4 w-4" />
                Backup Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="authenticator">
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">Enter the 6-digit code from your app</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={isVerifying}
                    autoFocus
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={code.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="backup">
              <form onSubmit={handleBackupCodeVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-code">Enter a backup code</Label>
                  <Input
                    id="backup-code"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    className="text-center text-xl tracking-widest font-mono"
                    disabled={isVerifying}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Each backup code can only be used once
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={backupCode.length < 8 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Use Backup Code"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
