import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller("security")
export class SecurityController {
  constructor(private readonly config: ConfigService) {}

  @Get("status")
  status(): { ok: true; checks: Record<string, boolean> } {
    const hasMongodb = Boolean(this.config.get("PJVPIN_MONGODB_URI"));
    const hasReniecToken = Boolean(this.config.get("PJVPIN_RENIEC_TOKEN"));
    const hasJwtSecret = Boolean(this.config.get("JWT_ACCESS_SECRET"));
    const hasRefreshSecret = Boolean(this.config.get("JWT_REFRESH_SECRET"));
    return {
      ok: true,
      checks: {
        mongodb_configured: hasMongodb,
        reniec_token_configured: hasReniecToken,
        jwt_access_configured: hasJwtSecret,
        jwt_refresh_configured: hasRefreshSecret,
      },
    };
  }
}
