import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { AuditContextService } from "./audit-context.service";
import { AuditJobListener } from "./audit-job.listener";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditService } from "./audit.service";
import { AUDIT_LOG_DEFAULT_PATH } from "../config/defaults";

@Global()
@Module({
  imports: [ConfigModule, ExternalHttpModule],
  providers: [
    {
      provide: "AUDIT_LOG_PATH",
      inject: [ConfigService],
      useFactory: (config: ConfigService): string =>
        config.get<string>("PJVPIN_AUDIT_LOG_PATH") ?? AUDIT_LOG_DEFAULT_PATH,
    },
    AuditService,
    AuditContextService,
    AuditJobListener,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AuditContextService],
})
export class AuditModule {}
