const API_ERROR_VARIANTS = [
  "ValidationError",
  "NotFound",
  "UniqueConstraintViolation",
  "ConfigurationError",
  "ExternalServiceError",
  "ReferentialIntegrity",
  "DatabaseError",
  "InternalError",
  "DataInconsistency",
] as const;

function extractVariantMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  for (const variant of API_ERROR_VARIANTS) {
    const value = obj[variant];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export const getTauriErrorMessage = (error: unknown): string => {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const maybe = error as Record<string, unknown>;

    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message;
    }

    const variantMsg = extractVariantMessage(maybe);
    if (variantMsg) return variantMsg;

    try {
      return JSON.stringify(error);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(error);
};
