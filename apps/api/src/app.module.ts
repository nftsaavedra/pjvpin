import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";
import { MongoModule } from "./infra/mongo/mongo.module";
import { AppErrorFilter } from "./infra/errors/app-error.filter";
import { RbacModule } from "./rbac/rbac.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsuariosModule } from "./usuarios/usuarios.module";
import { PersonasModule } from "./personas/personas.module";
import { HealthModule } from "./health/health.module";
import { SecurityModule } from "./security/security.module";
import { CatalogosModule } from "./catalogos/catalogos.module";
import { GeoModule } from "./geo/geo.module";
import { GradosModule } from "./grados/grados.module";
import { GruposModule } from "./grupos/grupos.module";
import { OrgUnitsModule } from "./org-units/org-units.module";
import { OcdeModule } from "./ocde/ocde.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 900_000,
        limit: 5,
      },
    ]),
    MongoModule,
    RbacModule,
    AuditModule,
    AuthModule,
    UsuariosModule,
    PersonasModule,
    HealthModule,
    SecurityModule,
    CatalogosModule,
    GeoModule,
    GradosModule,
    GruposModule,
    OrgUnitsModule,
    OcdeModule,
  ],
  providers: [
    AppErrorFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AppErrorFilter],
})
export class AppModule {}
