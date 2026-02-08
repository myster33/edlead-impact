import { useState, useCallback } from "react";

export interface ValidationErrors {
  [key: string]: string;
}

interface RequiredField {
  field: string;
  label: string;
  type?: "text" | "email" | "select" | "radio" | "checkbox" | "phone";
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation patterns by country
const phonePatterns: { [country: string]: { regex: RegExp; message: string } } = {
  "South Africa": { regex: /^0\d{9}$/, message: "10 digits starting with 0 (e.g., 0721234567)" },
  "Nigeria": { regex: /^0[789]\d{9}$/, message: "11 digits starting with 07, 08, or 09" },
  "Kenya": { regex: /^0[17]\d{8}$/, message: "10 digits starting with 01 or 07" },
  "Ghana": { regex: /^0[235]\d{8}$/, message: "10 digits starting with 02, 03, or 05" },
  "Tanzania": { regex: /^0[67]\d{8}$/, message: "10 digits starting with 06 or 07" },
  "Uganda": { regex: /^0[37]\d{8}$/, message: "10 digits starting with 03 or 07" },
  "Zimbabwe": { regex: /^0[17]\d{8}$/, message: "10 digits starting with 01 or 07" },
  "Botswana": { regex: /^7\d{7}$/, message: "8 digits starting with 7" },
  "Namibia": { regex: /^0[68]\d{7}$/, message: "9 digits starting with 06 or 08" },
  "Zambia": { regex: /^0[79]\d{8}$/, message: "10 digits starting with 07 or 09" },
  "Mozambique": { regex: /^8[234567]\d{7}$/, message: "9 digits starting with 82-87" },
  "Rwanda": { regex: /^07[238]\d{7}$/, message: "10 digits starting with 072, 073, or 078" },
  "Ethiopia": { regex: /^09\d{8}$/, message: "10 digits starting with 09" },
  "Egypt": { regex: /^01[0125]\d{8}$/, message: "11 digits starting with 010, 011, 012, or 015" },
  "Morocco": { regex: /^0[67]\d{8}$/, message: "10 digits starting with 06 or 07" },
};

const validatePhoneByCountry = (value: string, country: string): string => {
  const cleanedValue = value.replace(/[\s\-\(\)]/g, "");
  
  const pattern = phonePatterns[country];
  if (pattern) {
    if (!pattern.regex.test(cleanedValue)) {
      return `Please enter a valid phone number: ${pattern.message}`;
    }
  } else {
    // Generic validation for countries without specific patterns (min 7, max 15 digits)
    if (!/^\+?\d{7,15}$/.test(cleanedValue)) {
      return "Please enter a valid phone number (7-15 digits)";
    }
  }
  return "";
};

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback((field: string, value: string, label: string, type?: string, country?: string): string => {
    if (!value || value.trim() === "") {
      return `${label} is required`;
    }
    
    // Email validation removed - just check it's not empty

    if (type === "phone") {
      return validatePhoneByCountry(value, country || "");
    }
    
    return "";
  }, []);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateSingleField = useCallback((
    field: string,
    value: string,
    label: string,
    type?: string,
    country?: string
  ) => {
    const error = validateField(field, value, label, type, country);
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
    });
    setTouched((prev) => ({ ...prev, [field]: true }));
    return error;
  }, [validateField]);

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
    validateSingleField,
    markTouched,
    clearError,
    getFieldError,
    hasError,
  };
};
