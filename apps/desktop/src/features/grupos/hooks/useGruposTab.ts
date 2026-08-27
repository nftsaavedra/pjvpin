import { useState } from "react";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/shared/feedback/toast";
import { deleteGrupo, getAllGrupos, getTauriErrorMessage, type GrupoInvestigacion } from "../api";

export type Grupo = GrupoInvestigacion & {
  coordinador_nombre?: string;
};

export const useGruposTab = (_canManage: boolean) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: grupos,
    loading,
    refreshing,
    error,
    recargar,
  } = useStableFetchData<Grupo[]>(() => getAllGrupos(), 0, "Error cargando grupos", []);

  useRefreshToast({
    refreshing,
    message: "Actualizando grupos",
    toastKey: "grupos-refresh",
  });

  const handleCreate = () => {
    setEditingGrupo(null);
    setFormOpen(true);
  };

  const handleUpdate = (grupo: Grupo) => {
    setEditingGrupo(grupo);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteGrupo(deletingId);
      toast.success("Grupo eliminado correctamente");
      setDeletingId(null);
      await recargar();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const isCreating = formOpen && !editingGrupo;
  const isUpdating = formOpen && !!editingGrupo;

  return {
    grupos,
    loading,
    refreshing,
    error,
    recargar,
    formOpen,
    setFormOpen,
    editingGrupo,
    setEditingGrupo,
    isCreating,
    isUpdating,
    handleCreate,
    handleUpdate,
    handleDelete,
    deletingId,
    setDeletingId,
  };
};
