import { SetMetadata } from "@nestjs/common";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import {
  AUDIT_METADATA_KEY,
  AUDIT_USER_METADATA_KEY,
} from "./audit.constants";

export type AuditTarget =
  | { from: "param"; name?: string }
  | { from: "body"; path: string }
  | { from: "response"; field: string }
  | { from: "literal"; value: string }
  | { from: "context" }
  | { from: "compose"; fn: (ctx: AuditResolutionContext) => string };

export interface AuditResolutionContext {
  params: Record<string, string>;
  body: unknown;
  response: unknown;
  actor: AuthenticatedUser;
}

export type AuditDetailsSpec =
  | string
  | { static: string }
  | { from: "response"; pick: (response: unknown) => Record<string, unknown> | undefined }
  | { from: "context" }
  | { from: "resolver"; fn: (ctx: AuditResolutionContext) => Record<string, unknown> | undefined };

export interface AuditOptions {
  action: string;
  targetType: string;
  targetId?: AuditTarget;
  actor?: { from: "response" };
  details?: AuditDetailsSpec;
  deferToJob?: (response: unknown) => boolean;
}

export interface AuditUserOptions {
  action: string;
  actor?: { from: "response" };
}

export const Audit = (options: AuditOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(AUDIT_METADATA_KEY, options);

export const AuditUser = (options: AuditUserOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(AUDIT_USER_METADATA_KEY, options);
