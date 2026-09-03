import { useState, useEffect, useCallback } from "react";
import { subscribeJobEvents, type JobProgressEvent } from "./jobSocket";

export interface JobProgressState {
  estado: "idle" | "enqueued" | "running" | "completed" | "failed";
  progreso: number;
  unidadesProcesadas: number;
  totalUnidades: number;
  error?: string;
}

const INITIAL_STATE: JobProgressState = {
  estado: "idle",
  progreso: 0,
  unidadesProcesadas: 0,
  totalUnidades: 0,
};

export function useJobProgress(jobId: string | null): JobProgressState {
  const [state, setState] = useState<JobProgressState>(INITIAL_STATE);

  const handleEvent = useCallback(
    (event: JobProgressEvent) => {
      if (event.jobId !== jobId) return;
      setState({
        estado: event.estado,
        progreso: event.progreso,
        unidadesProcesadas: event.unidadesProcesadas,
        totalUnidades: event.totalUnidades,
        error: event.error,
      });
    },
    [jobId],
  );

  useEffect(() => {
    if (!jobId) {
      setState(INITIAL_STATE);
      return;
    }

    const unsubscribe = subscribeJobEvents(handleEvent, handleEvent, handleEvent);
    return unsubscribe;
  }, [jobId, handleEvent]);

  return state;
}
