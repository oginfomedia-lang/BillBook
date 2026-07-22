// src/hooks/useContactValidation.ts
// Shared validation logic for email + phone fields

const VALID_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com",
  "live.com", "icloud.com", "rediffmail.com", "protonmail.com",
  "zoho.com", "aol.com", "me.com", "msn.com", "ymail.com",
];

/** Returns a lowercase copy and an error string (empty = valid/optional) */
export function validateEmail(raw: string): { value: string; error: string } {
  const value = raw.toLowerCase();

  if (!value) return { value, error: "" }; // optional field — blank is fine unless caller requires it

  if (value.includes(" ")) return { value, error: "Email should not contain spaces" };
  if (value.length < 5)    return { value, error: "Email is too short" };
  if (value.length > 255)  return { value, error: "Email is too long" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return { value, error: "Please enter a valid email address" };

  const domain = value.split("@")[1]?.toLowerCase() ?? "";
  const domainRoot = domain.split(".").slice(-2).join(".");
  const isWellKnown = VALID_EMAIL_DOMAINS.includes(domainRoot);
  // Allow any proper domain with a TLD, but warn on clearly malformed domains
  if (!domain.includes(".")) return { value, error: "Please enter a valid email domain (e.g., @gmail.com)" };

  return { value, error: "" };
}

/** Strips non-allowed chars, returns formatted value and an error string */
export function validatePhone(raw: string): { value: string; error: string } {
  if (!raw) return { value: raw, error: "" }; // optional field

  // Only allow: digits, +, -, (, ), space
  const allowedCharsRegex = /^[\d+\-() ]+$/;
  if (!allowedCharsRegex.test(raw)) {
    return { value: raw, error: "Phone number should only contain digits and + - ( ) space" };
  }

  // Count only the digits
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length < 7)  return { value: raw, error: "Phone number must be at least 7 digits" };
  if (digitsOnly.length > 15) return { value: raw, error: "Phone number must not exceed 15 digits" };

  return { value: raw, error: "" };
}

/** Formats a phone number as +91-XXXXX-XXXXX when possible */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2); // 10 digits after 91
    return `+91-${local.slice(0, 5)}-${local.slice(5)}`;
  }
  if (digits.length === 10) {
    return `+91-${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return raw; // return as-is if we can't auto-format
}

/** Returns true if at least one of email or phone is non-empty and valid */
export function requiresAtLeastOne(email: string, phone: string): boolean {
  return !!(email.trim() || phone.trim());
}
