import { useMemo, useState } from "react";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { getAllPublicaciones } from "../api";
import { messages } from "@/shared/feedback/messages";
import type { PublicacionCientifica } from "@/shared/tauri/types";

export type OrigenFilter = "todos" | "PURE" | "MANUAL" | "PERUCRIS";

export interface PublicacionesTabState {
  publicaciones: PublicacionCientifica[];
  filtradas: PublicacionCientifica[];
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  recargar: () => Promise<void>;
  search: string;
  setSearch: (v: string) => void;
  anioFilter: string;
  setAnioFilter: (v: string) => void;
  tipoFilter: string;
  setTipoFilter: (v: string) => void;
  origenFilter: OrigenFilter;
  setOrigenFilter: (v: OrigenFilter) => void;
  aniosDisponibles: number[];
  tiposDisponibles: string[];
}

export const usePublicacionesTab = (refreshTrigger = 0): PublicacionesTabState => {
  const [search, setSearch] = useState("");
  const [anioFilter, setAnioFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [origenFilter, setOrigenFilter] = useState<OrigenFilter>("todos");

  const {
    data: publicaciones,
    loading,
    refreshing,
    error,
    recargar,
  } = useStableFetchData<PublicacionCientifica[]>(
    () => getAllPublicaciones(),
    refreshTrigger,
    messages.publicaciones.table.cargando,
    [],
  );

  useRefreshToast({
    refreshing,
    message: messages.publicaciones.table.cargando,
    toastKey: "publicaciones-refresh",
    cooldownMs: 120000,
  });

  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    for (const p of publicaciones) {
      if (typeof p.anio === "number") set.add(p.anio);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [publicaciones]);

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const p of publicaciones) set.add(p.tipo);
    return Array.from(set).sort();
  }, [publicaciones]);

  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return publicaciones.filter((p) => {
      if (anioFilter !== "todos" && String(p.anio ?? "") !== anioFilter) return false;
      if (tipoFilter !== "todos" && p.tipo !== tipoFilter) return false;
      if (origenFilter !== "todos" && (p.dominio_origen ?? "MANUAL") !== origenFilter) return false;
      if (term) {
        const haystack = `${p.titulo} ${p.doi ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [publicaciones, anioFilter, tipoFilter, origenFilter, search]);

  return {
    publicaciones,
    filtradas,
    loading,
    refreshing,
    error,
    recargar,
    search,
    setSearch,
    anioFilter,
    setAnioFilter,
    tipoFilter,
    setTipoFilter,
    origenFilter,
    setOrigenFilter,
    aniosDisponibles,
    tiposDisponibles,
  };
};
