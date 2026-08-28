import { SetMetadata } from "@nestjs/common";
import { AppPermission } from "./permissions.enum";

export const PERMISSION_KEY = "permission";
export const RequirePermission = (perm: AppPermission) => SetMetadata(PERMISSION_KEY, perm);
