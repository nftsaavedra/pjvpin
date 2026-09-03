import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter";
import { DEFAULT_CORS_ORIGINS } from "../config/defaults";

interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
}

export interface JobProgressEvent {
  jobId: string;
  id_usuario: string;
  estado: "enqueued" | "running" | "completed" | "failed";
  progreso: number;
  unidadesProcesadas: number;
  totalUnidades: number;
  error?: string;
}

@WebSocketGateway({
  namespace: "/jobs",
  cors: { origin: DEFAULT_CORS_ORIGINS, credentials: true },
})
export class JobEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(JobEventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ??
        (client.handshake.query as Record<string, string>)?.token;
      if (!token) {
        this.logger.warn(`WS sin token: ${client.id}`);
        client.disconnect(true);
        return;
      }
      const secret = this.config.get<string>("JWT_ACCESS_SECRET");
      const payload = this.jwt.verify<JwtPayload>(token, { secret });
      const room = `user:${payload.sub}`;
      void client.join(room);
      this.logger.debug(`WS conectado: ${client.id} → ${room}`);
    } catch {
      this.logger.warn(`WS token inválido: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WS desconectado: ${client.id}`);
  }

  @OnEvent("job.progress")
  handleJobProgress(event: JobProgressEvent): void {
    const room = `user:${event.id_usuario}`;
    this.server.to(room).emit("job.progress", event);
  }

  @OnEvent("job.completed")
  handleJobCompleted(event: JobProgressEvent): void {
    const room = `user:${event.id_usuario}`;
    this.server.to(room).emit("job.completed", event);
  }

  @OnEvent("job.failed")
  handleJobFailed(event: JobProgressEvent): void {
    const room = `user:${event.id_usuario}`;
    this.server.to(room).emit("job.failed", event);
  }
}
