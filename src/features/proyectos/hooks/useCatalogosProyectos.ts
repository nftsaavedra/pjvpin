import { useEffect, useState } from "react";
import { getCatalogos } from "@/features/configuracion/api";
import type { CatalogoItem } from "@/shared/tauri/types";

export interface CatalogosProyectos {
  estadoPatente: { value: string; label: string }[];
  etapaProducto: { value: string; label: string }[];
  tipoFinanciamiento: { value: string; label: string }[];
  estadoFinanciero: { value: string; label: string }[];
  error: string | null;
}

function mapItems(items: CatalogoItem[]) {
  return items.map((i) => ({ value: i.codigo, label: i.nombre }));
}

export function useCatalogosProyectos(): CatalogosProyectos {
  const [estadoPatente, setEstadoPatente] = useState<{ value: string; label: string }[]>([]);
  const [etapaProducto, setEtapaProducto] = useState<{ value: string; label: string }[]>([]);
  const [tipoFinanciamiento, setTipoFinanciamiento] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [estadoFinanciero, setEstadoFinanciero] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [ep, eta, tf, ef] = await Promise.all([
          getCatalogos("estado_patente"),
          getCatalogos("etapa_producto"),
          getCatalogos("tipo_financiamiento"),
          getCatalogos("estado_financiero"),
        ]);
        setEstadoPatente(mapItems(ep));
        setEtapaProducto(mapItems(eta));
        setTipoFinanciamiento(mapItems(tf));
        setEstadoFinanciero(mapItems(ef));
      } catch (err) {
        setError("Error cargando catálogos");
        console.error("useCatalogosProyectos:", err);
      }
    };
    void fetch();
  }, []);

  return {
    estadoPatente,
    etapaProducto,
    tipoFinanciamiento,
    estadoFinanciero,
    error,
  };
}
