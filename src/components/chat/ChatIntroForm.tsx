import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes } from "@/lib/country-codes";

interface ChatIntroFormProps {
  onStart: (name: string, email: string, phone: string, province: string) => void;
}

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

export function ChatIntroForm({ onStart }: ChatIntroFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+27|South Africa");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");

  const getCode = (val: string) => val.split("|")[0];

  const handleStart = () => {
    const fullPhone = phone.trim() ? `${getCode(countryCode)} ${phone.trim()}` : "";
    onStart(name, email, fullPhone, province);
  };

  return (
    <div className="flex-1 p-5 flex flex-col gap-3 justify-center">
      <div className="text-center mb-2">
        <p className="text-sm font-medium text-foreground">Welcome! 👋</p>
        <p className="text-xs text-muted-foreground mt-1">
          Share your details to start chatting with our team.
        </p>
      </div>
      <Input
        placeholder="Your name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex gap-1">
        <Select value={countryCode} onValueChange={setCountryCode}>
          <SelectTrigger className="w-[90px] shrink-0 text-xs px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {countryCodes.map((c) => (
              <SelectItem key={`${c.country}-${c.code}`} value={`${c.code}|${c.country}`}>
                {c.flag} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="WhatsApp number (optional)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1"
        />
      </div>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={province}
        onChange={(e) => setProvince(e.target.value)}
      >
        <option value="">Select Province (optional)</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <Button onClick={handleStart} disabled={!name.trim()} className="w-full">
        Start Chat
      </Button>
    </div>
  );
}
