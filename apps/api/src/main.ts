import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AppErrorFilter } from "./infra/errors/app-error.filter";
import { DEFAULT_GLOBAL_PREFIX, DEFAULT_PORT, DEFAULT_CORS_ORIGINS } from "./config/defaults";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.setGlobalPrefix(DEFAULT_GLOBAL_PREFIX);
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS.join(","))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AppErrorFilter());
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
  logger.log(`PJVPIN API escuchando en http://localhost:${port}/${DEFAULT_GLOBAL_PREFIX}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Error fatal al iniciar PJVPIN API:", err);
  process.exit(1);
});
