import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { MongoServerError } from "mongodb";
import { AppError } from "./app-error";
import { E11000_FIELDS_USER_FRIENDLY } from "../../config/defaults";
import { sanitizeExternalDetail } from "../utils/sanitize";

const STATUS_BY_VARIANT: Record<string, number> = {
  ValidationError: 400,
  NotFound: 404,
  UniqueConstraintViolation: 409,
  ReferentialIntegrity: 409,
  DataInconsistency: 409,
  ConfigurationError: 503,
  ExternalServiceError: 502,
  DatabaseError: 500,
  InternalError: 500,
};

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof AppError) {
      const status = STATUS_BY_VARIANT[exception.variant] ?? 500;
      const body: Record<string, string> = { [exception.variant]: exception.message };
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const message =
        typeof resp === "string"
          ? resp
          : (resp as { message?: unknown }).message
            ? String((resp as { message: unknown }).message)
            : exception.message;
      const body: Record<string, string> = { InternalError: sanitizeExternalDetail(message) };
      response.status(status).json(body);
      return;
    }

    const mongoErr = exception as Partial<MongoServerError> | null;
    if (mongoErr && (mongoErr.code === 11000 || mongoErr.code === "11000")) {
      const friendly = this.mapE11000ToFriendlyMessage(mongoErr);
      response.status(409).json({ UniqueConstraintViolation: friendly });
      return;
    }

    const fallback = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Unhandled exception: ${sanitizeExternalDetail(fallback)}`);
    response.status(500).json({ InternalError: "Error interno del servidor." });
  }

  private mapE11000ToFriendlyMessage(err: Partial<MongoServerError>): string {
    const keyPattern = (err.keyPattern ?? {}) as Record<string, unknown>;
    const keyValue = (err.keyValue ?? {}) as Record<string, unknown>;
    const firstField = Object.keys(keyPattern)[0] ?? Object.keys(keyValue)[0];
    if (firstField && E11000_FIELDS_USER_FRIENDLY[firstField]) {
      return E11000_FIELDS_USER_FRIENDLY[firstField];
    }
    if (firstField) {
      return `Ya existe un registro con el mismo valor en ${firstField}.`;
    }
    return "Ya existe un registro con los mismos valores unicos.";
  }
}
