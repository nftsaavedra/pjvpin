import { getAllInvestigadoresConProyectos, type InvestigadorDetalle } from "../api";
import { useStableFetch } from "@/shared/hooks/useStableFetch";

export const useFetchInvestigadores = (refreshTrigger = 0) => {
  const { data, loading, refreshing, error, recargar } = useStableFetch<InvestigadorDetalle[]>(
    () => getAllInvestigadoresConProyectos(),
    refreshTrigger,
    "Error cargando investigadores",
    [],
  );

  return {
    investigadores: data.filter((investigador) => investigador.activo === 1),
    loading,
    refreshing,
    error,
    recargar,
  };
};
