import { apiFetch } from "../http/client";
import type { EventoAcademico, ParticipanteEvento } from "./types";

export { type EventoAcademico, type ParticipanteEvento };

export const crearEvento = async (request: {
  nombre: string;
  tipo: string;
  fechaInicio?: number;
  fechaFin?: number;
  lugar?: string;
  descripcion?: string;
  participantes?: ParticipanteEvento[];
}): Promise<EventoAcademico> => {
  return apiFetch("/eventos", { method: "POST", body: request });
};

export const getAllEventos = async (): Promise<EventoAcademico[]> => {
  return apiFetch("/eventos");
};

export const getEventoById = async (id: string): Promise<EventoAcademico> => {
  return apiFetch(`/eventos/${encodeURIComponent(id)}`);
};

export const getEventosByInvestigador = async (
  investigadorId: string,
): Promise<EventoAcademico[]> => {
  return apiFetch(`/investigadores/${encodeURIComponent(investigadorId)}/eventos`);
};

export const actualizarEvento = async (
  id: string,
  request: {
    nombre?: string;
    tipo?: string;
    fechaInicio?: number;
    fechaFin?: number;
    lugar?: string;
    descripcion?: string;
    participantes?: ParticipanteEvento[];
  },
): Promise<EventoAcademico> => {
  return apiFetch(`/eventos/${encodeURIComponent(id)}`, { method: "PATCH", body: request });
};

export const eliminarEvento = async (id: string): Promise<void> => {
  await apiFetch(`/eventos/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const reactivarEvento = async (id: string): Promise<EventoAcademico> => {
  return apiFetch(`/eventos/${encodeURIComponent(id)}/reactivar`, { method: "PATCH" });
};
