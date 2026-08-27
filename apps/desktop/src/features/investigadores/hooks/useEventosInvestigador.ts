import { useState } from "react";
import { getEventosByInvestigador, getTauriErrorMessage } from "../api";
import type { EventoAcademico } from "@/shared/tauri/types";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";

export interface UseEventosInvestigadorResult {
  eventos: EventoAcademico[];
  isLoading: boolean;
  loaded: boolean;
  loadEventos: () => Promise<void>;
  resetEventos: () => void;
}

export const useEventosInvestigador = (investigadorId: string): UseEventosInvestigadorResult => {
  const [eventos, setEventos] = useState<EventoAcademico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadEventos = async (): Promise<void> => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const data = await getEventosByInvestigador(investigadorId);
      setEventos(data);
    } catch (error) {
      toast.error(`${messages.ui.error}: ${getTauriErrorMessage(error)}`);
      setEventos([]);
    } finally {
      setIsLoading(false);
      setLoaded(true);
    }
  };

  const resetEventos = (): void => {
    setEventos([]);
    setLoaded(false);
  };

  return { eventos, isLoading, loaded, loadEventos, resetEventos };
};
