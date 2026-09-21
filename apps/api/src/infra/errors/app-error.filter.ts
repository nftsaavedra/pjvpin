import { ArgumentsHost, Catch, HttpException, Logger } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
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
export class AppErrorFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  constructor(adapterHost: HttpAdapterHost) {
    // BaseExceptionFilter accepts the http adapter directly; we delegate
    // HttpException handling to NestJS native response shape via super.catch().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(adapterHost.httpAdapter as any);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof AppError) {
      const status = STATUS_BY_VARIANT[exception.variant] ?? 500;
      this.respond(host, status, exception.message, exception.variant);
      return;
    }

    const mongoErr = exception as Partial<MongoServerError> | null;
    if (mongoErr && (mongoErr.code === 11000 || mongoErr.code === "11000")) {
      this.respond(host, 409, this.mapE11000ToFriendlyMessage(mongoErr), "UniqueConstraintViolation");
      return;
    }

    if (exception instanceof HttpException) {
      super.catch(exception, host);
      return;
    }

    const fallback = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Unhandled exception: ${sanitizeExternalDetail(fallback)}`);
    this.respond(host, 500, "Error interno del servidor.", "InternalError");
  }

  private respond(host: ArgumentsHost, status: number, message: string, error: string): void {
    host.switchToHttp().getResponse().status(status).json({ statusCode: status, message, error });
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
