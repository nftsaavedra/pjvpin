import { SECRET_KEYWORDS_TO_REDACT, SANITIZE_MAX_LENGTH } from "../../config/defaults";

export function sanitizeExternalDetail(input: string): string {
  if (typeof input !== "string" || input.length === 0) return "";
  let sanitized = input;
  for (const keyword of SECRET_KEYWORDS_TO_REDACT) {
    const re = new RegExp(`(${keyword})\\s*[=:]\\s*([^\\s,;]+)`, "gi");
    sanitized = sanitized.replace(re, `$1=[REDACTED]`);
    const reBearer = new RegExp(`(${keyword})\\s+\"([^\"]+)\"`, "gi");
    sanitized = sanitized.replace(reBearer, `$1 "[REDACTED]"`);
  }
  sanitized = sanitized
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (sanitized.length > SANITIZE_MAX_LENGTH) {
    sanitized = `${sanitized.slice(0, SANITIZE_MAX_LENGTH - 3)}...`;
  }
  return sanitized;
}
