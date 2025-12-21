import { useState, useCallback } from "react";

export interface ValidationErrors {
  [key: string]: string;
}

interface RequiredField {
  field: string;
  label: string;
  type?: "text" | "email" | "select" | "radio" | "checkbox";
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback((field: string, value: string, label: string, type?: string): string => {
    if (!value || value.trim() === "") {
      return `${label} is required`;
    }
    
    if (type === "email" && !emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    
    return "";
  }, []);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateFields = useCallback((
    formData: { [key: string]: string | boolean },
    requiredFields: RequiredField[]
  ): { isValid: boolean; errors: ValidationErrors; firstErrorField: string | null } => {
    const newErrors: ValidationErrors = {};
    let firstErrorField: string | null = null;

    requiredFields.forEach(({ field, label, type }) => {
      const value = formData[field];
      const stringValue = typeof value === "boolean" ? (value ? "yes" : "") : (value || "");
      const error = validateField(field, stringValue, label, type);
      
      if (error) {
        newErrors[field] = error;
        if (!firstErrorField) {
          firstErrorField = field;
        }
      }
    });

    setErrors(newErrors);
    // Mark all fields as touched when validating
    const allTouched = requiredFields.reduce((acc, { field }) => {
      acc[field] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    setTouched(allTouched);

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
      firstErrorField,
    };
  }, [validateField]);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return touched[field] ? errors[field] : undefined;
  }, [errors, touched]);

  const hasError = useCallback((field: string): boolean => {
    return touched[field] && !!errors[field];
  }, [errors, touched]);

  return {
    errors,
    touched,
    validateFields,
    validateField,
    markTouched,
    clearError,
    getFieldError,
    hasError,
  };
};
