import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");

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
      <Input
        placeholder="WhatsApp number (optional)"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
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
      <Button onClick={() => onStart(name, email, phone, province)} disabled={!name.trim()} className="w-full">
        Start Chat
      </Button>
    </div>
  );
}
