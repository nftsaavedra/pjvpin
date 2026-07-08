import { invoke } from "./client";
import type { EventoAcademico, ParticipanteEvento } from "./types";

export { type EventoAcademico, type ParticipanteEvento };

export const crearEvento = async (request: {
  nombre: string;
  tipo: string;
  fecha_inicio?: number;
  fecha_fin?: number;
  lugar?: string;
  descripcion?: string;
  participantes?: ParticipanteEvento[];
}): Promise<EventoAcademico> => {
  return await invoke("crear_evento", { request });
};

export const getAllEventos = async (): Promise<EventoAcademico[]> => {
  return await invoke("get_all_eventos");
};

export const getEventoById = async (id: string): Promise<EventoAcademico> => {
  return await invoke("get_evento_by_id", { id });
};

export const getEventosByInvestigador = async (
  investigadorId: string,
): Promise<EventoAcademico[]> => {
  return await invoke("get_eventos_by_investigador", { docenteId: investigadorId });
};

export const actualizarEvento = async (
  id: string,
  request: {
    nombre?: string;
    tipo?: string;
    fecha_inicio?: number;
    fecha_fin?: number;
    lugar?: string;
    descripcion?: string;
    participantes?: ParticipanteEvento[];
  },
): Promise<EventoAcademico> => {
  return await invoke("actualizar_evento", { id, request });
};

export const eliminarEvento = async (id: string): Promise<void> => {
  await invoke("eliminar_evento", { id });
};

export const reactivarEvento = async (id: string): Promise<EventoAcademico> => {
  return await invoke("reactivar_evento", { id });
};
