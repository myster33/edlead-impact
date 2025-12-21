import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldWrapperProps {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export const FormFieldWrapper = ({ children, error, className }: FormFieldWrapperProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};
