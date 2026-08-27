import { useMemo, useState } from "react";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import {
  eliminarInvestigador,
  getAllInvestigadoresConProyectos,
  getTauriErrorMessage,
  reactivarInvestigador,
  refrescarFormacionAcademicaRenacytInvestigador,
  refrescarRenacytTodos,
  type InvestigadorDetalle,
} from "../api";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const useInvestigadoresTable = (refreshTrigger = 0) => {
  const [investigadorToDelete, setInvestigadorToDelete] = useState<InvestigadorDetalle | null>(
    null,
  );
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [gradoFiltro, setGradoFiltro] = useState("todos");
  const [renacytNivelFiltro, setRenacytNivelFiltro] = useState("todos");
  const [refreshingRenacytInvestigadorId, setRefreshingRenacytInvestigadorId] = useState<
    string | null
  >(null);
  const [isRefreshingRenacytTodos, setIsRefreshingRenacytTodos] = useState(false);

  const {
    data: investigadores,
    loading,
    refreshing,
    error,
    recargar: cargarInvestigadores,
  } = useStableFetchData<InvestigadorDetalle[]>(
    () => getAllInvestigadoresConProyectos(),
    refreshTrigger,
    "Error cargando investigadores",
    [],
  );

  useRefreshToast({
    refreshing,
    message: "Actualizando investigadores",
    toastKey: "investigadores-refresh",
  });

  const handleEliminarInvestigador = async () => {
    if (!investigadorToDelete) return;
    try {
      const resultado = await eliminarInvestigador(investigadorToDelete.idInvestigador);
      toast.info(resultado.mensaje);
      setInvestigadorToDelete(null);
      await cargarInvestigadores();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const handleReactivarInvestigador = async (id: string) => {
    try {
      await reactivarInvestigador(id);
      toast.success(messages.investigadores.toast.investigadorReactivado);
      await cargarInvestigadores();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const handleRefreshRenacytFormaciones = async (id: string) => {
    setRefreshingRenacytInvestigadorId(id);
    try {
      const resultado = await refrescarFormacionAcademicaRenacytInvestigador(id);
      if (resultado.actualizada) {
        toast.success(resultado.mensaje);
      } else {
        toast.info(resultado.mensaje);
      }

      await cargarInvestigadores();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setRefreshingRenacytInvestigadorId(null);
    }
  };

  const handleRefrescarRenacytTodos = async () => {
    setIsRefreshingRenacytTodos(true);
    try {
      const resultado = await refrescarRenacytTodos();
      toast.success(
        messages.investigadores.kardex.refrescarTodos.exito(
          resultado.procesados,
          resultado.errores,
        ),
      );
      await cargarInvestigadores();
    } catch (error) {
      toast.error(
        `${messages.investigadores.kardex.refrescarTodos.fallo}: ${getTauriErrorMessage(error)}`,
      );
    } finally {
      setIsRefreshingRenacytTodos(false);
    }
  };

  const totalActivos = useMemo(
    () => investigadores.filter((investigador) => investigador.activo === 1).length,
    [investigadores],
  );
  const totalInactivos = useMemo(
    () => investigadores.filter((investigador) => investigador.activo === 0).length,
    [investigadores],
  );
  const gradosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          investigadores.map((investigador) =>
            normalizeText(investigador.grado) ? investigador.grado : "Sin grado",
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [investigadores],
  );
  const nivelesRenacytDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          investigadores.map(
            (investigador) => formatRenacytNivel(investigador.renacytNivel) ?? "Sin nivel RENACYT",
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [investigadores],
  );

  const investigadoresFiltrados = useMemo(
    () =>
      investigadores
        .filter((investigador) => {
          if (estadoFiltro === "activos") return investigador.activo === 1;
          if (estadoFiltro === "inactivos") return investigador.activo === 0;
          return true;
        })
        .filter((investigador) => {
          if (gradoFiltro === "todos") return true;
          return (
            (normalizeText(investigador.grado) ? investigador.grado : "Sin grado") === gradoFiltro
          );
        })
        .filter((investigador) => {
          if (renacytNivelFiltro === "todos") return true;
          return (
            (formatRenacytNivel(investigador.renacytNivel) ?? "Sin nivel RENACYT") ===
            renacytNivelFiltro
          );
        })
        .filter((investigador) => {
          const texto = normalizeText(busqueda);
          if (!texto) return true;
          return (
            normalizeText(investigador.nombresApellidos).includes(texto) ||
            normalizeText(investigador.dni).includes(texto) ||
            normalizeText(investigador.grado).includes(texto) ||
            normalizeRenacytNivelSearch(investigador.renacytNivel).includes(texto)
          );
        }),
    [busqueda, investigadores, estadoFiltro, gradoFiltro, renacytNivelFiltro],
  );

  const hasActiveFilters =
    estadoFiltro !== "todos" ||
    gradoFiltro !== "todos" ||
    renacytNivelFiltro !== "todos" ||
    busqueda.trim() !== "";

  const limpiarFiltros = () => {
    setEstadoFiltro("todos");
    setGradoFiltro("todos");
    setRenacytNivelFiltro("todos");
    setBusqueda("");
  };

  return {
    busqueda,
    cargarInvestigadores,
    hasActiveFilters,
    investigadorToDelete,
    investigadores,
    investigadoresFiltrados,
    error,
    estadoFiltro,
    gradoFiltro,
    gradosDisponibles,
    handleEliminarInvestigador,
    handleRefrescarRenacytTodos,
    handleRefreshRenacytFormaciones,
    handleReactivarInvestigador,
    isRefreshingRenacytTodos,
    limpiarFiltros,
    loading,
    nivelesRenacytDisponibles,
    renacytNivelFiltro,
    refreshingRenacytInvestigadorId,
    setBusqueda,
    setInvestigadorToDelete,
    setEstadoFiltro,
    setGradoFiltro,
    setRenacytNivelFiltro,
    totalActivos,
    totalInactivos,
  };
};
