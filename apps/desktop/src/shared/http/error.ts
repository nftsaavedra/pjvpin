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

const STATUS_MESSAGES: Record<number, string> = {
  400: "Solicitud incorrecta",
  401: "Sesion expirada o credenciales invalidas",
  403: "No tiene permisos para esta accion",
  404: "Recurso no encontrado",
  409: "Conflicto con datos existentes",
  500: "Error interno del servidor",
  502: "Servicio externo no disponible",
  503: "Servicio no configurado",
};

function extractVariantMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  for (const variant of API_ERROR_VARIANTS) {
    const value = obj[variant];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function getApiErrorMessage(status: number, body: unknown): string {
  const variantMsg = extractVariantMessage(body);
  if (variantMsg) return variantMsg;

  if (typeof body === "string" && body.trim()) return body;

  const statusMsg = STATUS_MESSAGES[status];
  if (statusMsg) return statusMsg;

  return `Error HTTP ${status}`;
}
