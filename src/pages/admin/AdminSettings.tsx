import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/use-audit-log";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, Key, User, Check, X, Save, Camera, Trash2, Mail, Bell, AlertTriangle, FileText, Users, UserCheck, Sun, Moon, Monitor, MessageSquare, Phone } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const countries = [
  "South Africa", "Nigeria", "Kenya", "Ghana", "Tanzania", "Uganda", 
  "Zimbabwe", "Botswana", "Namibia", "Zambia", "Mozambique", "Rwanda", 
  "Ethiopia", "Egypt", "Morocco"
];

const provincesByCountry: { [key: string]: string[] } = {
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  "Nigeria": ["Lagos", "Kano", "Rivers", "Kaduna", "Oyo", "Abuja FCT", "Anambra", "Delta", "Enugu", "Imo"],
  "Kenya": ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Kiambu", "Machakos"],
  "Ghana": ["Greater Accra", "Ashanti", "Western", "Eastern", "Central", "Northern", "Volta"],
  "Tanzania": ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar", "Mbeya"],
  "Uganda": ["Central", "Eastern", "Northern", "Western", "Kampala"],
  "Zimbabwe": ["Harare", "Bulawayo", "Manicaland", "Mashonaland", "Matabeleland"],
  "Botswana": ["Central", "Ghanzi", "Kgalagadi", "Kgatleng", "Kweneng", "North-East", "North-West", "South-East", "Southern"],
  "Namibia": ["Khomas", "Erongo", "Oshana", "Omusati", "Ohangwena", "Kavango East"],
  "Zambia": ["Lusaka", "Copperbelt", "Southern", "Central", "Eastern", "Northern"],
  "Mozambique": ["Maputo", "Gaza", "Inhambane", "Sofala", "Manica", "Tete", "Zambezia"],
  "Rwanda": ["Kigali", "Eastern", "Northern", "Southern", "Western"],
  "Ethiopia": ["Addis Ababa", "Oromia", "Amhara", "Tigray", "SNNPR"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan"],
  "Morocco": ["Casablanca-Settat", "Rabat-Salé-Kénitra", "Marrakech-Safi", "Fès-Meknès", "Tanger-Tétouan-Al Hoceïma"],
};

export default function AdminSettings() {
  const { user, adminUser, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logAction } = useAuditLog();
  const { theme, setTheme } = useTheme();
  const [themePreference, setThemePreference] = useState<string>("system");

  // Profile state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [notifyApplications, setNotifyApplications] = useState(true);
  const [notifyBlogs, setNotifyBlogs] = useState(true);
  const [notifyAdminChanges, setNotifyAdminChanges] = useState(true);
  const [notifyCriticalAlerts, setNotifyCriticalAlerts] = useState(true);
  const [notifyPerformanceReports, setNotifyPerformanceReports] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Password change state
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
  
  // System settings state (admin only)
  const [parentEmailsEnabled, setParentEmailsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [whatsappNotificationsEnabled, setWhatsappNotificationsEnabled] = useState(false);
  const [isLoadingSystemSettings, setIsLoadingSystemSettings] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin");
    }
  }, [adminUser, authLoading, navigate]);

  useEffect(() => {
    fetchMfaFactors();
    fetchProfile();
    if (adminUser?.role === "admin") {
      fetchSystemSettings();
    }
  }, [adminUser]);

  const fetchSystemSettings = async () => {
    setIsLoadingSystemSettings(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["parent_emails_enabled", "sms_notifications_enabled", "whatsapp_notifications_enabled"]);
      
      if (error) throw error;
      
      if (data) {
        data.forEach((setting: any) => {
          const value = setting.setting_value === true || setting.setting_value === "true";
          if (setting.setting_key === "parent_emails_enabled") {
            setParentEmailsEnabled(value);
          } else if (setting.setting_key === "sms_notifications_enabled") {
            setSmsNotificationsEnabled(value);
          } else if (setting.setting_key === "whatsapp_notifications_enabled") {
            setWhatsappNotificationsEnabled(value);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    } finally {
      setIsLoadingSystemSettings(false);
    }
  };

  const handleParentEmailsToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: enabled,
          updated_by: adminUser?.id 
        })
        .eq("setting_key", "parent_emails_enabled");
      
      if (error) throw error;
      
      setParentEmailsEnabled(enabled);
      
      await logAction({
        action: enabled ? "parent_emails_enabled" : "parent_emails_disabled",
        table_name: "system_settings",
        record_id: undefined,
        new_values: { parent_emails_enabled: enabled },
      });
      
      toast({
        title: enabled ? "Parent emails enabled" : "Parent emails disabled",
        description: enabled 
          ? "Parents/guardians will receive notification emails." 
          : "Parents/guardians will no longer receive notification emails.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSmsToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: enabled,
          updated_by: adminUser?.id 
        })
        .eq("setting_key", "sms_notifications_enabled");
      
      if (error) throw error;
      
      setSmsNotificationsEnabled(enabled);
      
      await logAction({
        action: enabled ? "sms_notifications_enabled" : "sms_notifications_disabled",
        table_name: "system_settings",
        record_id: undefined,
        new_values: { sms_notifications_enabled: enabled },
      });
      
      toast({
        title: enabled ? "SMS notifications enabled" : "SMS notifications disabled",
        description: enabled 
          ? "Applicants will receive SMS notifications." 
          : "SMS notifications are now disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleWhatsappToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: enabled,
          updated_by: adminUser?.id 
        })
        .eq("setting_key", "whatsapp_notifications_enabled");
      
      if (error) throw error;
      
      setWhatsappNotificationsEnabled(enabled);
      
      await logAction({
        action: enabled ? "whatsapp_notifications_enabled" : "whatsapp_notifications_disabled",
        table_name: "system_settings",
        record_id: undefined,
        new_values: { whatsapp_notifications_enabled: enabled },
      });
      
      toast({
        title: enabled ? "WhatsApp notifications enabled" : "WhatsApp notifications disabled",
        description: enabled 
          ? "Applicants will receive WhatsApp notifications." 
          : "WhatsApp notifications are now disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    if (!adminUser?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("full_name, phone, position, country, province, profile_picture_url, email_digest_enabled, notify_applications, notify_blogs, notify_admin_changes, notify_critical_alerts, notify_performance_reports, theme_preference")
        .eq("id", adminUser.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setPosition(data.position || "");
        setCountry(data.country || "");
        setProvince(data.province || "");
        setProfilePictureUrl(data.profile_picture_url || null);
        setEmailDigestEnabled(data.email_digest_enabled ?? true);
        setNotifyApplications(data.notify_applications ?? true);
        setNotifyBlogs(data.notify_blogs ?? true);
        setNotifyAdminChanges(data.notify_admin_changes ?? true);
        setNotifyCriticalAlerts(data.notify_critical_alerts ?? true);
        setNotifyPerformanceReports(data.notify_performance_reports ?? true);
        setThemePreference(data.theme_preference || "system");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    setThemePreference(newTheme);
    
    if (adminUser?.id) {
      try {
        await supabase
          .from("admin_users")
          .update({ theme_preference: newTheme })
          .eq("id", adminUser.id);
      } catch (error) {
        console.error("Error saving theme preference:", error);
      }
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !adminUser?.user_id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${adminUser.user_id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("admin-avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("admin-avatars")
        .getPublicUrl(fileName);

      // Update the admin_users record
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({ profile_picture_url: publicUrl })
        .eq("id", adminUser.id);

      if (updateError) throw updateError;

      setProfilePictureUrl(publicUrl);
      toast({
        title: "Photo Uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!adminUser?.id) return;

    setIsUploadingPhoto(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ profile_picture_url: null })
        .eq("id", adminUser.id);

      if (error) throw error;

      setProfilePictureUrl(null);
      toast({
        title: "Photo Removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const sendNotification = async (changeType: "profile_updated" | "password_changed" | "mfa_enabled" | "mfa_disabled") => {
    if (!user?.email) return;
    
    try {
      await supabase.functions.invoke("notify-profile-change", {
        body: {
          email: user.email,
          name: fullName || user.email.split("@")[0],
          change_type: changeType,
        },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const initials = (fullName || adminUser?.email || "AD")
    .split(/[\s@]/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join("");

  const handleSaveProfile = async () => {
    if (!adminUser?.id) return;

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          position: position.trim() || null,
          country: country || null,
          province: province || null,
        })
        .eq("id", adminUser.id);

      if (error) throw error;

      // Log and notify
      await logAction({
        action: "profile_updated",
        table_name: "admin_users",
        record_id: adminUser.id,
        new_values: { full_name: fullName, phone, position, country, province },
      });
      await sendNotification("profile_updated");

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

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

      // Log and notify
      await logAction({
        action: "password_changed",
        table_name: "admin_users",
        record_id: adminUser?.id,
      });
      await sendNotification("password_changed");

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

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

      // Log and notify
      await logAction({
        action: "mfa_enabled",
        table_name: "admin_users",
        record_id: adminUser?.id,
      });
      await sendNotification("mfa_enabled");

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

      // Log and notify
      await logAction({
        action: "mfa_disabled",
        table_name: "admin_users",
        record_id: adminUser?.id,
      });
      await sendNotification("mfa_disabled");

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
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Upload a photo for your admin profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    {profilePictureUrl && (
                      <AvatarImage src={profilePictureUrl} alt="Profile" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}
                      Upload Photo
                    </Button>
                    {profilePictureUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Max 2MB. JPG, PNG, or GIF.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Information (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and role.
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

            {/* Editable Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>
                  Update your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g., Program Coordinator"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={(val) => {
                      setCountry(val);
                      setProvince("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Province / Region</Label>
                    <Select 
                      value={province} 
                      onValueChange={setProvince}
                      disabled={!country}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={country ? "Select province" : "Select country first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(provincesByCountry[country] || []).map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            {/* Theme Preference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Choose your preferred theme for the admin portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={themePreference}
                  onValueChange={handleThemeChange}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="theme-light"
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      themePreference === "light" ? "border-primary" : "border-muted"
                    }`}
                  >
                    <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                    <Sun className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Light</span>
                  </Label>
                  <Label
                    htmlFor="theme-dark"
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      themePreference === "dark" ? "border-primary" : "border-muted"
                    }`}
                  >
                    <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                    <Moon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Dark</span>
                  </Label>
                  <Label
                    htmlFor="theme-system"
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      themePreference === "system" ? "border-primary" : "border-muted"
                    }`}
                  >
                    <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                    <Monitor className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">System</span>
                  </Label>
                </RadioGroup>
                <p className="text-sm text-muted-foreground mt-4">
                  {themePreference === "system" 
                    ? "Theme will automatically match your device settings." 
                    : `Using ${themePreference} theme.`}
                </p>
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
            <TwoFactorSetup 
              adminUserId={adminUser?.id}
              onStatusChange={(enabled) => {
                setMfaEnabled(enabled);
                if (enabled) {
                  logAction({
                    action: "mfa_enabled",
                    table_name: "admin_users",
                    record_id: adminUser?.id,
                  });
                  sendNotification("mfa_enabled");
                } else {
                  logAction({
                    action: "mfa_disabled",
                    table_name: "admin_users",
                    record_id: adminUser?.id,
                  });
                  sendNotification("mfa_disabled");
                }
              }}
            />

            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Manage your email notification preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weekly Digest */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="digest-toggle" className="font-medium">Weekly Audit Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of admin activity every Monday.
                    </p>
                  </div>
                  <Switch
                    id="digest-toggle"
                    checked={emailDigestEnabled}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error } = await supabase
                          .from("admin_users")
                          .update({ email_digest_enabled: checked })
                          .eq("id", adminUser?.id);
                        
                        if (error) throw error;
                        
                        setEmailDigestEnabled(checked);
                        toast({
                          title: checked ? "Digest enabled" : "Digest disabled",
                          description: checked 
                            ? "You will receive weekly audit log digests." 
                            : "You will no longer receive weekly audit log digests.",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Failed to update preference",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>

                {/* Critical Alerts */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-0.5">
                      <Label htmlFor="critical-toggle" className="font-medium">Critical Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Instant notifications for admin deletions, password changes, and 2FA changes.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="critical-toggle"
                    checked={notifyCriticalAlerts}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error } = await supabase
                          .from("admin_users")
                          .update({ notify_critical_alerts: checked })
                          .eq("id", adminUser?.id);
                        
                        if (error) throw error;
                        
                        setNotifyCriticalAlerts(checked);
                        toast({
                          title: checked ? "Critical alerts enabled" : "Critical alerts disabled",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Failed to update preference",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </div>

                {/* Category Preferences */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-4">Notification Categories</h4>
                  <div className="space-y-4">
                    {/* Applications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-applications" className="font-medium text-sm">Applications</Label>
                          <p className="text-xs text-muted-foreground">
                            Notifications about application approvals, rejections, and deletions.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="notify-applications"
                        checked={notifyApplications}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("admin_users")
                              .update({ notify_applications: checked })
                              .eq("id", adminUser?.id);
                            
                            if (error) throw error;
                            setNotifyApplications(checked);
                          } catch (error: any) {
                            toast({
                              title: "Failed to update preference",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </div>

                    {/* Blog Posts */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-blogs" className="font-medium text-sm">Blog Posts</Label>
                          <p className="text-xs text-muted-foreground">
                            Notifications about blog submissions, approvals, and deletions.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="notify-blogs"
                        checked={notifyBlogs}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("admin_users")
                              .update({ notify_blogs: checked })
                              .eq("id", adminUser?.id);
                            
                            if (error) throw error;
                            setNotifyBlogs(checked);
                          } catch (error: any) {
                            toast({
                              title: "Failed to update preference",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </div>

                    {/* Admin Changes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-admin" className="font-medium text-sm">Admin Changes</Label>
                          <p className="text-xs text-muted-foreground">
                            Notifications about admin user additions, updates, and role changes.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="notify-admin"
                        checked={notifyAdminChanges}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("admin_users")
                              .update({ notify_admin_changes: checked })
                              .eq("id", adminUser?.id);
                            
                            if (error) throw error;
                            setNotifyAdminChanges(checked);
                          } catch (error: any) {
                            toast({
                              title: "Failed to update preference",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </div>

                    {/* Performance Reports */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="notify-performance" className="font-medium text-sm">Performance Reports</Label>
                          <p className="text-xs text-muted-foreground">
                            Weekly and monthly automated performance reports with reviewer statistics.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="notify-performance"
                        checked={notifyPerformanceReports}
                        onCheckedChange={async (checked) => {
                          try {
                            const { error } = await supabase
                              .from("admin_users")
                              .update({ notify_performance_reports: checked })
                              .eq("id", adminUser?.id);
                            
                            if (error) throw error;
                            setNotifyPerformanceReports(checked);
                          } catch (error: any) {
                            toast({
                              title: "Failed to update preference",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Only Section */}
            {adminUser?.role === "admin" && (
              <>
                {/* Global Email Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Global Email Settings
                    </CardTitle>
                    <CardDescription>
                      System-wide email notification settings that affect all users.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="parent-emails-toggle" className="font-medium">Parent/Guardian Emails</Label>
                          <p className="text-sm text-muted-foreground">
                            When enabled, parents/guardians will receive copies of all learner notification emails (status changes, approvals, certificates).
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="parent-emails-toggle"
                        checked={parentEmailsEnabled}
                        onCheckedChange={handleParentEmailsToggle}
                        disabled={isLoadingSystemSettings}
                      />
                    </div>
                </CardContent>
                </Card>

                {/* SMS & WhatsApp Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS & WhatsApp Notifications
                    </CardTitle>
                    <CardDescription>
                      Enable or disable SMS and WhatsApp notifications for applicants and parents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="sms-toggle" className="font-medium">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send SMS notifications to applicants and parents for status updates, approvals, and important announcements.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="sms-toggle"
                        checked={smsNotificationsEnabled}
                        onCheckedChange={handleSmsToggle}
                        disabled={isLoadingSystemSettings}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-0.5">
                          <Label htmlFor="whatsapp-toggle" className="font-medium">WhatsApp Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send WhatsApp messages to applicants and parents for status updates, approvals, and important announcements.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="whatsapp-toggle"
                        checked={whatsappNotificationsEnabled}
                        onCheckedChange={handleWhatsappToggle}
                        disabled={isLoadingSystemSettings}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Send Digest */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Send Audit Digest
                    </CardTitle>
                    <CardDescription>
                      Manually trigger the weekly audit log digest to all subscribed admins.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Send Digest Now</p>
                        <p className="text-sm text-muted-foreground">
                          Send a summary of the last 7 days of admin activity to all subscribed admins.
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          setIsSendingDigest(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("send-audit-digest");
                            if (error) throw error;
                            toast({
                              title: "Digest sent",
                              description: `Successfully sent digest to ${data.emailsSent} admin(s).`,
                            });
                          } catch (error: any) {
                            toast({
                              title: "Failed to send digest",
                              description: error.message,
                              variant: "destructive",
                            });
                          } finally {
                            setIsSendingDigest(false);
                          }
                        }}
                        disabled={isSendingDigest}
                      >
                        {isSendingDigest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Digest Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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