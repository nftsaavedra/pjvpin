/**
 * Variantes mapean 1:1 al enum Rust `AppError` (ver docs/backend/03 §2).
 * Mantener este set sincronizado con el frontend (`src/shared/tauri/error.ts` + `getTauriErrorMessage`)
 * para que las respuestas del API sean decodificables sin cambios en el cliente.
 */
export type AppErrorVariant =
  | "ValidationError"
  | "NotFound"
  | "UniqueConstraintViolation"
  | "ConfigurationError"
  | "ExternalServiceError"
  | "ReferentialIntegrity"
  | "DatabaseError"
  | "InternalError"
  | "DataInconsistency";

export class AppError extends Error {
  readonly variant: AppErrorVariant;

  constructor(variant: AppErrorVariant, message: string) {
    super(message);
    this.name = "AppError";
    this.variant = variant;
  }

  static validation(message: string): AppError {
    return new AppError("ValidationError", message);
  }
  static notFound(message: string): AppError {
    return new AppError("NotFound", message);
  }
  static unique(message: string): AppError {
    return new AppError("UniqueConstraintViolation", message);
  }
  static config(message: string): AppError {
    return new AppError("ConfigurationError", message);
  }
  static external(message: string): AppError {
    return new AppError("ExternalServiceError", message);
  }
  static referential(message: string): AppError {
    return new AppError("ReferentialIntegrity", message);
  }
  static database(message: string): AppError {
    return new AppError("DatabaseError", message);
  }
  static internal(message: string): AppError {
    return new AppError("InternalError", message);
  }
  static dataInconsistency(message: string): AppError {
    return new AppError("DataInconsistency", message);
  }
}
