import { useState, useCallback } from "react";

export interface ProyectoFormState {
  titulo: string;
  docentesSeleccionados: string[];
  docenteResponsableId: string | null;
}

export function useProyectoFormState(initial: Partial<ProyectoFormState> = {}) {
  const [titulo, setTitulo] = useState(initial.titulo ?? "");
  const [docentesSeleccionados, setDocentesSeleccionados] = useState<string[]>(
    initial.docentesSeleccionados ?? [],
  );
  const [docenteResponsableId, setDocenteResponsableId] = useState<string | null>(
    initial.docenteResponsableId ?? null,
  );

  const reset = useCallback(() => {
    setTitulo("");
    setDocentesSeleccionados([]);
    setDocenteResponsableId(null);
  }, []);

  const handleChangeDocentesSeleccionados = useCallback((ids: string[]) => {
    setDocentesSeleccionados(ids);
    setDocenteResponsableId((current) => {
      if (ids.length === 0) return null;
      if (current && ids.includes(current)) return current;
      return ids[0] ?? null;
    });
  }, []);

  const isValid =
    titulo.trim().length > 0 && docentesSeleccionados.length > 0 && docenteResponsableId !== null;

  return {
    titulo,
    setTitulo,
    docentesSeleccionados,
    setDocentesSeleccionados,
    docenteResponsableId,
    setDocenteResponsableId,
    handleChangeDocentesSeleccionados,
    reset,
    isValid,
  };
}
