import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "../http/config";
import { getAccessToken } from "../http/tokenStore";

export interface JobProgressEvent {
  jobId: string;
  id_usuario: string;
  estado: "enqueued" | "running" | "completed" | "failed";
  progreso: number;
  unidadesProcesadas: number;
  totalUnidades: number;
  error?: string;
}

type Listener = (event: JobProgressEvent) => void;

let socket: Socket | null = null;
const listeners = new Map<string, Set<Listener>>();

function getSocket(): Socket {
  if (socket) return socket;

  const url = getApiBaseUrl().replace(/\/api\/v1$/, "");
  const token = getAccessToken();

  socket = io(`${url}/jobs`, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ["websocket", "polling"],
  });

  socket.on("job.progress", (event: JobProgressEvent) => {
    listeners.get("job.progress")?.forEach((fn) => fn(event));
  });

  socket.on("job.completed", (event: JobProgressEvent) => {
    listeners.get("job.completed")?.forEach((fn) => fn(event));
  });

  socket.on("job.failed", (event: JobProgressEvent) => {
    listeners.get("job.failed")?.forEach((fn) => fn(event));
  });

  socket.on("disconnect", () => {
    // Reconnect handled by socket.io-client automatically
  });

  return socket;
}

export function subscribeJobEvents(
  onProgress: Listener,
  onCompleted: Listener,
  onFailed: Listener,
): () => void {
  getSocket();

  if (!listeners.has("job.progress")) listeners.set("job.progress", new Set());
  if (!listeners.has("job.completed")) listeners.set("job.completed", new Set());
  if (!listeners.has("job.failed")) listeners.set("job.failed", new Set());

  listeners.get("job.progress")!.add(onProgress);
  listeners.get("job.completed")!.add(onCompleted);
  listeners.get("job.failed")!.add(onFailed);

  return () => {
    listeners.get("job.progress")?.delete(onProgress);
    listeners.get("job.completed")?.delete(onCompleted);
    listeners.get("job.failed")?.delete(onFailed);
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
