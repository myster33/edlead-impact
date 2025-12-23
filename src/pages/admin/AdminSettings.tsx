import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, Key, User, Smartphone, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function AdminSettings() {
  const { user, adminUser, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin");
    }
  }, [adminUser, authLoading, navigate]);

  useEffect(() => {
    fetchMfaFactors();
  }, []);

  const fetchMfaFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactors = data?.totp || [];
      setMfaFactors(totpFactors);
      setMfaEnabled(totpFactors.some((f: any) => f.status === "verified"));
    } catch (error) {
      console.error("Error fetching MFA factors:", error);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEnrollMfa = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      if (data) {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setTotpSecret(data.totp.secret);
        setShowEnrollDialog(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start 2FA enrollment.",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!factorId || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account.",
      });

      setShowEnrollDialog(false);
      setVerifyCode("");
      setQrCode(null);
      setTotpSecret(null);
      setFactorId(null);
      fetchMfaFactors();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "The code you entered is incorrect.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    const verifiedFactor = mfaFactors.find((f: any) => f.status === "verified");
    if (!verifiedFactor) return;

    setIsUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (error) throw error;

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });

      fetchMfaFactors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA.",
        variant: "destructive",
      });
    } finally {
      setIsUnenrolling(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your account details and role information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {adminUser?.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {adminUser?.role === "admin" && "Full access to all features"}
                      {adminUser?.role === "reviewer" && "Can review and update applications"}
                      {adminUser?.role === "viewer" && "Read-only access"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {adminUser?.created_at
                      ? new Date(adminUser.created_at).toLocaleDateString("en-ZA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                >
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account using an authenticator app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${mfaEnabled ? "bg-green-100" : "bg-muted"}`}>
                      {mfaEnabled ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {mfaEnabled ? "2FA is enabled" : "2FA is not enabled"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mfaEnabled
                          ? "Your account is protected with two-factor authentication."
                          : "Enable 2FA to add an extra layer of security."}
                      </p>
                    </div>
                  </div>
                  {mfaEnabled ? (
                    <Button
                      variant="destructive"
                      onClick={handleDisableMfa}
                      disabled={isUnenrolling}
                    >
                      {isUnenrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button onClick={handleEnrollMfa} disabled={isEnrolling}>
                      {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enable 2FA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 2FA Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (like Google Authenticator or Authy), then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center p-4 bg-background rounded-lg border">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}

            {totpSecret && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Or enter this code manually:</p>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {totpSecret}
                </code>
              </div>
            )}

            <div className="space-y-2">
              <Label>Enter verification code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyMfa}
              disabled={isVerifying || verifyCode.length !== 6}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}