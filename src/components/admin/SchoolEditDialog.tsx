import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  country: string;
  school_code: string;
  emis_number: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
}

interface SchoolEditDialogProps {
  school: SchoolRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SchoolEditDialog({ school, open, onOpenChange, onSaved }: SchoolEditDialogProps) {
  const [name, setName] = useState("");
  const [emisNumber, setEmisNumber] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (school) {
      setName(school.name);
      setEmisNumber(school.emis_number || "");
      setAddress(school.address || "");
      setProvince(school.province || "");
      setEmail(school.email || "");
      setPhone(school.phone || "");
    }
  }, [school]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "School name is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const updateData: Record<string, string | null> = {
      name: name.trim(),
      emis_number: emisNumber.trim() || null,
      address: address.trim() || null,
      province: province.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };

    if (school) {
      // Update existing
      const { error } = await supabase
        .from("schools")
        .update(updateData)
        .eq("id", school.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "School updated successfully" });
        onOpenChange(false);
        onSaved();
      }
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name *</Label>
            <Input id="school-name" value={name} onChange={e => setName(e.target.value)} placeholder="School name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emis-number">EMIS Number</Label>
            <Input id="emis-number" value={emisNumber} onChange={e => setEmisNumber(e.target.value)} placeholder="e.g. 400100001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-address">Address</Label>
            <Input id="school-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="School address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-province">Province</Label>
            <Input id="school-province" value={province} onChange={e => setProvince(e.target.value)} placeholder="e.g. Gauteng" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school-email">Email</Label>
              <Input id="school-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="school@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone">Phone</Label>
              <Input id="school-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
