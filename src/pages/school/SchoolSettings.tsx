import { useState, useEffect } from "react";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, Shield, ShieldCheck, ShieldOff, School, Camera } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function SchoolSettings() {
  const { schoolUser, currentSchool, user } = useSchoolAuth();
  const { toast } = useToast();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // School logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (schoolUser) {
      setFullName(schoolUser.full_name || "");
      setPhone(schoolUser.phone || "");
      setProfilePicUrl(schoolUser.profile_picture_url || null);
    }
    if (currentSchool) {
      setLogoUrl(currentSchool.logo_url || null);
    }
  }, [schoolUser, currentSchool]);

  // Check MFA status
  useEffect(() => {
    const checkMfa = async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        const totp = data?.totp || [];
        const verified = totp.find((f) => f.status === "verified");
        setMfaEnabled(!!verified);
      } catch {
        // ignore
      } finally {
        setMfaLoading(false);
      }
    };
    checkMfa();
  }, []);

  const handleSaveProfile = async () => {
    if (!schoolUser) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("school_users")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          profile_picture_url: profilePicUrl,
        })
        .eq("id", schoolUser.id);

      if (error) throw error;
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolUser) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${schoolUser.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("school-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("school-assets")
        .getPublicUrl(path);
      
      setProfilePicUrl(publicUrl);
      await supabase.from("school_users").update({ profile_picture_url: publicUrl }).eq("id", schoolUser.id);
      toast({ title: "Photo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSchool) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${currentSchool.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("school-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("school-assets")
        .getPublicUrl(path);

      await supabase.from("schools").update({ logo_url: publicUrl }).eq("id", currentSchool.id);
      setLogoUrl(publicUrl);
      toast({ title: "School logo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  // MFA Enroll
  const handleEnrollMfa = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "School Portal" });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!factorId || !verifyCode) return;
    setVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });
      if (verify.error) throw verify.error;

      setMfaEnabled(true);
      setQrCode(null);
      setFactorId(null);
      setVerifyCode("");
      toast({ title: "2FA enabled", description: "Two-factor authentication is now active." });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisabling(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
        if (error) throw error;
      }
      setMfaEnabled(false);
      toast({ title: "2FA disabled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDisabling(false);
    }
  };

  const initials = (fullName || "U").split(/\s/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("");

  return (
    <SchoolLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your profile, school logo, and security.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="school"><School className="h-4 w-4 mr-1" />School</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Update your personal information and photo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicUrl || undefined} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={uploadingAvatar}>
                        <span>
                          {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                          Change photo
                        </span>
                      </Button>
                    </Label>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={schoolUser?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={schoolUser?.role?.replace("_", " ") || ""} disabled className="bg-muted capitalize" />
                </div>

                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* School Tab */}
          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle>School Logo</CardTitle>
                <CardDescription>Upload or update your school's logo. This will be displayed across the portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="School logo" className="h-full w-full object-contain" />
                    ) : (
                      <School className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                        <span>
                          {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                          {logoUrl ? "Change logo" : "Upload logo"}
                        </span>
                      </Button>
                    </Label>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <p className="text-xs text-muted-foreground mt-1">Square image recommended. Max 2MB.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>School name</Label>
                    <Input value={currentSchool?.name || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>EMIS number</Label>
                    <Input value={currentSchool?.emis_number || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>School code</Label>
                    <Input value={currentSchool?.school_code || ""} disabled className="bg-muted" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">School details can only be changed by edLEAD administration.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  {mfaEnabled
                    ? "2FA is enabled. Your account has an extra layer of security."
                    : "Add an extra layer of security to your account using a TOTP authenticator app."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mfaLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
                  </div>
                ) : mfaEnabled ? (
                  <Button variant="destructive" onClick={handleDisableMfa} disabled={disabling}>
                    {disabling && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Disable 2FA
                  </Button>
                ) : qrCode ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy):
                    </p>
                    <div className="flex justify-center">
                      <img src={qrCode} alt="QR Code" className="h-48 w-48 rounded-lg border" />
                    </div>
                    <div className="flex gap-2 max-w-xs mx-auto">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                      />
                      <Button onClick={handleVerifyMfa} disabled={verifying || verifyCode.length !== 6}>
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleEnrollMfa} disabled={enrolling}>
                    {enrolling && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    <Shield className="h-4 w-4 mr-1" /> Enable 2FA
                  </Button>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Change password</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the password reset option on the login page to change your password.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/school/reset-password">Reset password</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SchoolLayout>
  );
}
