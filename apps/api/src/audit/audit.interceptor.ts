import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

/**
 * Extension point documentado. En fase B la auditoria la disparan los
 * services explicitamente (mismo patron que en shared/audit.rs del backend
 * Rust). Se conserva como hook global para fases futuras (auditoria
 * declarativa por anotacion).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  }
}
