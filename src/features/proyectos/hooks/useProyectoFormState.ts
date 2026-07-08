import { useState, useCallback } from "react";

export interface ProyectoFormState {
  titulo: string;
  investigadoresSeleccionados: string[];
  investigadorResponsableId: string | null;
}

export function useProyectoFormState(initial: Partial<ProyectoFormState> = {}) {
  const [titulo, setTitulo] = useState(initial.titulo ?? "");
  const [investigadoresSeleccionados, setInvestigadoresSeleccionados] = useState<string[]>(
    initial.investigadoresSeleccionados ?? [],
  );
  const [investigadorResponsableId, setInvestigadorResponsableId] = useState<string | null>(
    initial.investigadorResponsableId ?? null,
  );

  const reset = useCallback(() => {
    setTitulo("");
    setInvestigadoresSeleccionados([]);
    setInvestigadorResponsableId(null);
  }, []);

  const handleChangeInvestigadoresSeleccionados = useCallback((ids: string[]) => {
    setInvestigadoresSeleccionados(ids);
    setInvestigadorResponsableId((current) => {
      if (ids.length === 0) return null;
      if (current && ids.includes(current)) return current;
      return ids[0] ?? null;
    });
  }, []);

  const isValid =
    titulo.trim().length > 0 &&
    investigadoresSeleccionados.length > 0 &&
    investigadorResponsableId !== null;

  return {
    titulo,
    setTitulo,
    investigadoresSeleccionados,
    setInvestigadoresSeleccionados,
    investigadorResponsableId,
    setInvestigadorResponsableId,
    handleChangeInvestigadoresSeleccionados,
    reset,
    isValid,
  };
}
