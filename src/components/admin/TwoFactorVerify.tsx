import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ArrowLeft, Key, Phone, Mail } from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorVerifyProps {
  factorId?: string;
  adminUserId?: string;
  onVerified: () => void;
  onCancel: () => void;
  /** For Email/SMS 2FA - the portal type */
  portalType?: "admin" | "school" | "portal";
  /** For Email/SMS 2FA - the preferred channel */
  twoFaChannel?: "email" | "sms";
}

export function TwoFactorVerify({ factorId, adminUserId, onVerified, onCancel, portalType, twoFaChannel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [activeTab, setActiveTab] = useState(factorId ? "authenticator" : "emailsms");
  const { toast } = useToast();

  const isEmailSmsMode = portalType && !factorId;
  const hasTotpAndEmailSms = !!factorId && !!portalType;

  const getFunctionName = () => {
    if (portalType === "admin") return "admin-send-2fa-code";
    return "school-send-2fa-code";
  };

  const sendEmailSmsCode = async () => {
    setIsSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke(getFunctionName(), {
        body: { action: "send", channel: twoFaChannel || "email" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCodeSent(true);
      toast({
        title: "Code sent",
        description: twoFaChannel === "sms" ? "Check your phone for the code." : "Check your email for the code.",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleEmailSmsVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke(getFunctionName(), {
        body: { action: "verify_login", code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onVerified();
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message || "Invalid code.", variant: "destructive" });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !factorId) return;

    setIsVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId, challengeId: challenge.id, code,
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message || "Invalid code.", variant: "destructive" });
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
        body: { code: backupCode, adminUserId },
      });
      if (error) throw error;
      if (!data.valid) throw new Error(data.error || "Invalid backup code");

      toast({ title: "Backup Code Used", description: `${data.remainingCodes} backup codes remaining.` });
      onVerified();
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
      setBackupCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  // Determine which tabs to show
  const showAuthenticatorTab = !!factorId;
  const showEmailSmsTab = !!portalType;
  const showBackupTab = !!adminUserId && showAuthenticatorTab;

  const tabCount = [showAuthenticatorTab, showEmailSmsTab, showBackupTab].filter(Boolean).length;

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
            <img src={edleadLogo} alt="edLEAD Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>Verify your identity to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {tabCount > 1 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full grid-cols-${tabCount} mb-4`}>
                {showAuthenticatorTab && (
                  <TabsTrigger value="authenticator" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Authenticator
                  </TabsTrigger>
                )}
                {showEmailSmsTab && (
                  <TabsTrigger value="emailsms" className="gap-2">
                    {twoFaChannel === "sms" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    {twoFaChannel === "sms" ? "SMS" : "Email"}
                  </TabsTrigger>
                )}
                {showBackupTab && (
                  <TabsTrigger value="backup" className="gap-2">
                    <Key className="h-4 w-4" />
                    Backup
                  </TabsTrigger>
                )}
              </TabsList>

              {showAuthenticatorTab && (
                <TabsContent value="authenticator">
                  <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Enter the 6-digit code from your app</Label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000"
                        value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        className="text-center text-2xl tracking-[0.5em] font-mono" disabled={isVerifying} autoFocus />
                    </div>
                    <Button type="submit" className="w-full" disabled={code.length !== 6 || isVerifying}>
                      {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify"}
                    </Button>
                  </form>
                </TabsContent>
              )}

              {showEmailSmsTab && (
                <TabsContent value="emailsms">
                  {!codeSent ? (
                    <div className="space-y-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        We'll send a verification code to your {twoFaChannel === "sms" ? "phone" : "email"}.
                      </p>
                      <Button onClick={sendEmailSmsCode} disabled={isSendingCode} className="w-full">
                        {isSendingCode ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Code"}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailSmsVerify} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Enter the 6-digit code sent to your {twoFaChannel === "sms" ? "phone" : "email"}</Label>
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000"
                          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                          className="text-center text-2xl tracking-[0.5em] font-mono" disabled={isVerifying} autoFocus />
                      </div>
                      <Button type="submit" className="w-full" disabled={code.length !== 6 || isVerifying}>
                        {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify"}
                      </Button>
                      <Button variant="link" size="sm" onClick={sendEmailSmsCode} disabled={isSendingCode} className="w-full">
                        Resend code
                      </Button>
                    </form>
                  )}
                </TabsContent>
              )}

              {showBackupTab && (
                <TabsContent value="backup">
                  <form onSubmit={handleBackupCodeVerify} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Enter a backup code</Label>
                      <Input type="text" placeholder="XXXX-XXXX" value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                        className="text-center text-xl tracking-widest font-mono" disabled={isVerifying} />
                      <p className="text-xs text-muted-foreground text-center">Each backup code can only be used once</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={backupCode.length < 8 || isVerifying}>
                      {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Use Backup Code"}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>
          ) : showEmailSmsTab ? (
            // Single mode: Email/SMS only (no tabs)
            !codeSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  We'll send a verification code to your {twoFaChannel === "sms" ? "phone" : "email"}.
                </p>
                <Button onClick={sendEmailSmsCode} disabled={isSendingCode} className="w-full">
                  {isSendingCode ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Code"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSmsVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter the 6-digit code sent to your {twoFaChannel === "sms" ? "phone" : "email"}</Label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-[0.5em] font-mono" disabled={isVerifying} autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={code.length !== 6 || isVerifying}>
                  {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify"}
                </Button>
                <Button variant="link" size="sm" onClick={sendEmailSmsCode} disabled={isSendingCode} className="w-full">
                  Resend code
                </Button>
              </form>
            )
          ) : null}

          <Button type="button" variant="ghost" onClick={onCancel} className="w-full mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
