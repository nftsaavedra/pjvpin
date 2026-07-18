import { useMemo, useState } from "react";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/shared/feedback/toast";
import {
  eliminarInvestigador,
  getAllInvestigadoresConProyectos,
  getTauriErrorMessage,
  reactivarInvestigador,
  refrescarFormacionAcademicaRenacytInvestigador,
  type InvestigadorDetalle,
} from "../api";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const useInvestigadoresTable = (refreshTrigger = 0) => {
  const [selectedInvestigador, setSelectedInvestigador] = useState<InvestigadorDetalle | null>(
    null,
  );
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
      const resultado = await eliminarInvestigador(investigadorToDelete.id_investigador);
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
      toast.success("Investigador reactivado correctamente");
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

      setSelectedInvestigador((current) =>
        current?.id_investigador === id ? resultado.investigador : current,
      );
      await cargarInvestigadores();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setRefreshingRenacytInvestigadorId(null);
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
            (investigador) => formatRenacytNivel(investigador.renacyt_nivel) ?? "Sin nivel RENACYT",
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
            (formatRenacytNivel(investigador.renacyt_nivel) ?? "Sin nivel RENACYT") ===
            renacytNivelFiltro
          );
        })
        .filter((investigador) => {
          const texto = normalizeText(busqueda);
          if (!texto) return true;
          return (
            normalizeText(investigador.nombres_apellidos).includes(texto) ||
            normalizeText(investigador.dni).includes(texto) ||
            normalizeText(investigador.grado).includes(texto) ||
            normalizeRenacytNivelSearch(investigador.renacyt_nivel).includes(texto)
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
    handleRefreshRenacytFormaciones,
    handleReactivarInvestigador,
    limpiarFiltros,
    loading,
    nivelesRenacytDisponibles,
    renacytNivelFiltro,
    refreshingRenacytInvestigadorId,
    selectedInvestigador,
    setBusqueda,
    setInvestigadorToDelete,
    setEstadoFiltro,
    setGradoFiltro,
    setRenacytNivelFiltro,
    setSelectedInvestigador,
    totalActivos,
    totalInactivos,
  };
};
