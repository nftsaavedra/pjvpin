import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { snakeToCamelKeys } from "./camel-case";
import { SKIP_SERIALIZATION_KEY } from "./skip-serialization.decorator";

/**
 * Interceptor global que transforma las keys de la response de snake_case a camelCase.
 *
 * - Respeta `@SkipSerialization()` en el handler o controller.
 * - No transforma `Buffer`, `string`, `ReadableStream`, `undefined`.
 * - Los pipes globales corren en orden de registro, así que este transforma primero.
 */
@Injectable()
export class SnakeToCamelInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SERIALIZATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) return data;
        if (typeof data === "string") return data;
        if (Buffer.isBuffer(data)) return data;
        if (data instanceof ReadableStream) return data;
        return snakeToCamelKeys(data);
      }),
    );
  }
}
