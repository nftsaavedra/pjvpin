const STATUS_MESSAGES: Record<number, string> = {
  400: "Solicitud incorrecta",
  401: "Sesion expirada o credenciales invalidas",
  403: "No tiene permisos para esta accion",
  404: "Recurso no encontrado",
  409: "Conflicto con datos existentes",
  429: "Demasiadas solicitudes. Intente mas tarde.",
  500: "Error interno del servidor",
  502: "Servicio externo no disponible",
  503: "Servicio no configurado",
};

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  const msg = obj.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg)) {
    const joined = msg.filter((m): m is string => typeof m === "string").join("; ").trim();
    if (joined) return joined;
  }
  return null;
}

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function getApiErrorMessage(status: number, body: unknown): string {
  const message = extractMessage(body);
  if (message) return message;

  if (typeof body === "string" && body.trim()) return body;

  const statusMsg = STATUS_MESSAGES[status];
  if (statusMsg) return statusMsg;

  return `Error HTTP ${status}`;
}

export const getErrorMessage = (error: unknown): string => {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const maybe = error as Record<string, unknown>;

    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message;
    }

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
