// Standard 15-character GSTIN format:
// 2-digit state code + 10-char PAN + 1 entity code + literal 'Z' + 1 checksum char.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** GSTIN is optional — empty/undefined counts as valid; only rejects a malformed value. */
export function isValidGSTIN(value: string | null | undefined): boolean {
  if (!value) return true;
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export const GSTIN_ERROR_MESSAGE = "Invalid GSTIN format. Expected 15 characters, e.g. 27ABCDE1234F1Z5.";
