import { PipeTransform, Injectable } from "@nestjs/common";
import { camelToSnakeKeys } from "./camel-case";

/**
 * Pipe global que transforma las keys del body/query de camelCase a snake_case
 * ANTES de que `ValidationPipe` valide contra los DTOs (que son snake_case).
 *
 * Registrado en `main.ts` con `app.useGlobalPipes(new CamelToSnakePipe(), new ValidationPipe(...))`.
 * Los pipes globales corren en orden de registro, así que este transforma primero.
 */
@Injectable()
export class CamelToSnakePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    return camelToSnakeKeys(value);
  }
}
