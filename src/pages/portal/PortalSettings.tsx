import { useState, useEffect } from "react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, ShieldOff, Phone, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PortalSettings() {
  const { portalUser } = usePortalAuth();
  const { toast } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [twoFaChannel, setTwoFaChannel] = useState<"email" | "sms">("email");

  useEffect(() => {
    if (portalUser) {
      setMfaEnabled(!!(portalUser as any).two_fa_enabled);
      setTwoFaChannel(((portalUser as any).two_fa_channel as "email" | "sms") || "email");
      setMfaLoading(false);
    }
  }, [portalUser]);

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("school-send-2fa-code", {
        body: { action: "send", channel: twoFaChannel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCodeSent(true);
      toast({
        title: "Code sent",
        description: twoFaChannel === "sms" ? "Check your phone." : "Check your email.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("school-send-2fa-code", {
        body: { action: "verify", code: verifyCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMfaEnabled(true);
      setCodeSent(false);
      setVerifyCode("");
      toast({ title: "2FA enabled", description: "Two-factor authentication is now active." });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2fa = async () => {
    setDisabling(true);
    try {
      const { data, error } = await supabase.functions.invoke("school-send-2fa-code", {
        body: { action: "disable" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMfaEnabled(false);
      toast({ title: "2FA disabled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDisabling(false);
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your security preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              {mfaEnabled
                ? "2FA is enabled. A verification code will be required on login."
                : "Add an extra layer of security to your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
              </div>
            ) : mfaEnabled ? (
              <Button variant="destructive" onClick={handleDisable2fa} disabled={disabling}>
                {disabling && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Disable 2FA
              </Button>
            ) : codeSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A 6-digit code has been sent to {twoFaChannel === "sms" ? <strong>your phone</strong> : <strong>your email</strong>}.
                </p>
                <div className="flex gap-2 max-w-xs">
                  <Input placeholder="Enter 6-digit code" value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
                  <Button onClick={handleVerifyCode} disabled={verifying || verifyCode.length !== 6}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
                <Button variant="link" size="sm" onClick={handleSendCode} disabled={sendingCode}>Resend code</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant={twoFaChannel === "sms" ? "default" : "outline"} size="sm" onClick={() => setTwoFaChannel("sms")}>
                    <Phone className="h-4 w-4 mr-1" /> SMS
                  </Button>
                  <Button variant={twoFaChannel === "email" ? "default" : "outline"} size="sm" onClick={() => setTwoFaChannel("email")}>
                    <Mail className="h-4 w-4 mr-1" /> Email
                  </Button>
                </div>
                {twoFaChannel === "sms" && !portalUser?.phone && (
                  <p className="text-sm text-destructive">Please ask your school admin to add a phone number to your profile first.</p>
                )}
                <Button onClick={handleSendCode} disabled={sendingCode || (twoFaChannel === "sms" && !portalUser?.phone)}>
                  {sendingCode && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Shield className="h-4 w-4 mr-1" /> Enable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
