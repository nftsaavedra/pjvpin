import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AuthModule } from "../auth/auth.module";
import { JobEventsGateway } from "./job-events.gateway";

@Module({
  imports: [EventEmitterModule.forRoot(), AuthModule],
  providers: [JobEventsGateway],
  exports: [JobEventsGateway],
})
export class WsModule {}
