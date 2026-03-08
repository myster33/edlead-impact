import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const checks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, color } = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    const passed = checks.filter((c) => c.test(password)).length;
    if (passed <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (passed <= 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
    if (passed <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
    if (passed === 4) return { score: 4, label: "Strong", color: "bg-emerald-500" };
    return { score: 5, label: "Very Strong", color: "bg-emerald-600" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= score ? color : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", {
          "text-destructive": score <= 1,
          "text-orange-500": score === 2,
          "text-yellow-600": score === 3,
          "text-emerald-500": score >= 4,
        })}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {checks.map((c) => {
          const passed = c.test(password);
          return (
            <div key={c.label} className="flex items-center gap-1 text-xs">
              {passed ? (
                <Check className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <span className={passed ? "text-emerald-600" : "text-muted-foreground"}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
