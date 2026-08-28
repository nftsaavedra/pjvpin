import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SecurityController } from "./security.controller";

@Module({
  imports: [ConfigModule],
  controllers: [SecurityController],
})
export class SecurityModule {}
