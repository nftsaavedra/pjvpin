import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AUDIT_LOG_DEFAULT_PATH } from "../config/defaults";
import { AuditService } from "./audit.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "AUDIT_LOG_PATH",
      inject: [ConfigService],
      useFactory: (config: ConfigService): string =>
        config.get<string>("PJVPIN_AUDIT_LOG_PATH") ?? AUDIT_LOG_DEFAULT_PATH,
    },
    AuditService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
