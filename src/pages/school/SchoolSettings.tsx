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
import { Loader2, Upload, User, Shield, ShieldCheck, ShieldOff, School, Camera, Phone, Mail, Bot } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import SchoolChatKnowledgeTab from "@/components/school/SchoolChatKnowledgeTab";

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
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [twoFaChannel, setTwoFaChannel] = useState<"email" | "sms">("sms");

  useEffect(() => {
    if (schoolUser) {
      setFullName(schoolUser.full_name || "");
      setPhone(schoolUser.phone || "");
      setProfilePicUrl(schoolUser.profile_picture_url || null);
      setMfaEnabled(!!(schoolUser as any).two_fa_enabled);
      setMfaLoading(false);
    }
    if (currentSchool) {
      setLogoUrl(currentSchool.logo_url || null);
    }
  }, [schoolUser, currentSchool]);

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

  // Email-based 2FA
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
        description: twoFaChannel === "sms" 
          ? "Check your phone for the verification code." 
          : "Check your email for the verification code." 
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
            <TabsTrigger value="ai-chat"><Bot className="h-4 w-4 mr-1" />AI Chat</TabsTrigger>
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
                  {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  {mfaEnabled
                    ? "2FA is enabled. A verification code will be sent to your email on login."
                    : "Add an extra layer of security. A code will be emailed to you each time you sign in."}
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
                      A 6-digit code has been sent to {twoFaChannel === "sms" ? <strong>{schoolUser?.phone}</strong> : <strong>{schoolUser?.email}</strong>}. Enter it below to enable 2FA.
                    </p>
                    <div className="flex gap-2 max-w-xs">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                      />
                      <Button onClick={handleVerifyCode} disabled={verifying || verifyCode.length !== 6}>
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                    <Button variant="link" size="sm" onClick={handleSendCode} disabled={sendingCode}>
                      Resend code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant={twoFaChannel === "sms" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTwoFaChannel("sms")}
                      >
                        <Phone className="h-4 w-4 mr-1" /> SMS
                      </Button>
                      <Button
                        variant={twoFaChannel === "email" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTwoFaChannel("email")}
                      >
                        <Mail className="h-4 w-4 mr-1" /> Email
                      </Button>
                    </div>
                    {twoFaChannel === "sms" && !schoolUser?.phone && (
                      <p className="text-sm text-destructive">Please add a phone number to your profile first.</p>
                    )}
                    <Button 
                      onClick={handleSendCode} 
                      disabled={sendingCode || (twoFaChannel === "sms" && !schoolUser?.phone)}
                    >
                      {sendingCode && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      <Shield className="h-4 w-4 mr-1" /> Enable 2FA
                    </Button>
                  </div>
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
