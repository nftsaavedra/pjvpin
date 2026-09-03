import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JobEventsGateway } from "./job-events.gateway";

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [JobEventsGateway],
  exports: [JobEventsGateway],
})
export class WsModule {}
