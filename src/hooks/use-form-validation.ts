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
  // Africa
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
  "Cameroon": { regex: /^6\d{8}$/, message: "9 digits starting with 6" },
  "Senegal": { regex: /^7[0-9]\d{7}$/, message: "9 digits starting with 7" },
  "Ivory Coast": { regex: /^0[157]\d{8}$/, message: "10 digits starting with 01, 05, or 07" },
  "Angola": { regex: /^9[1-9]\d{7}$/, message: "9 digits starting with 9" },
  "Congo (DRC)": { regex: /^0[89]\d{8}$/, message: "10 digits starting with 08 or 09" },
  "Madagascar": { regex: /^03[2-4]\d{7}$/, message: "10 digits starting with 032, 033, or 034" },
  "Malawi": { regex: /^0[89]\d{8}$/, message: "10 digits starting with 08 or 09" },
  "Sierra Leone": { regex: /^0[2-9]\d{7}$/, message: "9 digits starting with 0" },
  "Lesotho": { regex: /^[56]\d{7}$/, message: "8 digits starting with 5 or 6" },
  "Eswatini": { regex: /^7[6-9]\d{6}$/, message: "8 digits starting with 76-79" },
  // Europe
  "United Kingdom": { regex: /^0?7\d{9}$/, message: "10-11 digits, mobile starting with 07" },
  "Germany": { regex: /^0?1[5-7]\d{8,9}$/, message: "10-11 digits, mobile starting with 015-017" },
  "France": { regex: /^0?[67]\d{8}$/, message: "9-10 digits, mobile starting with 06 or 07" },
  "Netherlands": { regex: /^0?6\d{8}$/, message: "9-10 digits, mobile starting with 06" },
  "Spain": { regex: /^[67]\d{8}$/, message: "9 digits starting with 6 or 7" },
  "Italy": { regex: /^3\d{8,9}$/, message: "9-10 digits starting with 3" },
  "Portugal": { regex: /^9[1-9]\d{7}$/, message: "9 digits starting with 9" },
  "Belgium": { regex: /^0?4\d{8}$/, message: "9-10 digits, mobile starting with 04" },
  "Sweden": { regex: /^0?7\d{8}$/, message: "9-10 digits, mobile starting with 07" },
  "Norway": { regex: /^[49]\d{7}$/, message: "8 digits starting with 4 or 9" },
  "Denmark": { regex: /^[2-9]\d{7}$/, message: "8 digits" },
  "Ireland": { regex: /^0?8[3-9]\d{7}$/, message: "9-10 digits, mobile starting with 083-089" },
  "Poland": { regex: /^[5-8]\d{8}$/, message: "9 digits starting with 5-8" },
  "Switzerland": { regex: /^0?7[5-9]\d{7}$/, message: "9-10 digits, mobile starting with 075-079" },
  // Americas
  "United States": { regex: /^[2-9]\d{9}$/, message: "10 digits (area code + number)" },
  "Canada": { regex: /^[2-9]\d{9}$/, message: "10 digits (area code + number)" },
  "Brazil": { regex: /^[1-9]\d{10}$/, message: "11 digits (area code + 9 + number)" },
  "Mexico": { regex: /^[1-9]\d{9}$/, message: "10 digits" },
  "Argentina": { regex: /^[1-9]\d{9,10}$/, message: "10-11 digits" },
  "Colombia": { regex: /^3\d{9}$/, message: "10 digits starting with 3" },
  "Chile": { regex: /^9\d{8}$/, message: "9 digits starting with 9" },
  "Peru": { regex: /^9\d{8}$/, message: "9 digits starting with 9" },
  // Asia & Middle East
  "India": { regex: /^[6-9]\d{9}$/, message: "10 digits starting with 6-9" },
  "China": { regex: /^1[3-9]\d{9}$/, message: "11 digits starting with 13-19" },
  "Japan": { regex: /^0?[789]0\d{8}$/, message: "10-11 digits, mobile starting with 070/080/090" },
  "South Korea": { regex: /^0?1[0-9]\d{7,8}$/, message: "10-11 digits, mobile starting with 01" },
  "Indonesia": { regex: /^0?8\d{8,11}$/, message: "9-12 digits, mobile starting with 08" },
  "Philippines": { regex: /^0?9\d{9}$/, message: "10-11 digits, mobile starting with 09" },
  "Malaysia": { regex: /^0?1\d{8,9}$/, message: "9-10 digits, mobile starting with 01" },
  "Thailand": { regex: /^0?[689]\d{8}$/, message: "9-10 digits" },
  "Vietnam": { regex: /^0?[3-9]\d{8}$/, message: "9-10 digits" },
  "Pakistan": { regex: /^0?3\d{9}$/, message: "10-11 digits, mobile starting with 03" },
  "Bangladesh": { regex: /^0?1[3-9]\d{8}$/, message: "10-11 digits, mobile starting with 01" },
  "Sri Lanka": { regex: /^0?7\d{8}$/, message: "9-10 digits, mobile starting with 07" },
  "United Arab Emirates": { regex: /^0?5[0-9]\d{7}$/, message: "9-10 digits, mobile starting with 05" },
  "Saudi Arabia": { regex: /^0?5\d{8}$/, message: "9-10 digits, mobile starting with 05" },
  "Turkey": { regex: /^0?5\d{9}$/, message: "10-11 digits, mobile starting with 05" },
  "Israel": { regex: /^0?5\d{8}$/, message: "9-10 digits, mobile starting with 05" },
  // Oceania
  "Australia": { regex: /^0?4\d{8}$/, message: "9-10 digits, mobile starting with 04" },
  "New Zealand": { regex: /^0?2[0-9]\d{7,8}$/, message: "9-10 digits, mobile starting with 02" },
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
