import { useEffect, useState } from "react";
import { getCatalogos } from "@/features/configuracion/api";
import type { CatalogoItem } from "@/shared/tauri/types";

export interface CatalogosProyectos {
  estadoPatente: { value: string; label: string }[];
  tipoPatente: { value: string; label: string }[];
  etapaProducto: { value: string; label: string }[];
  tipoProducto: { value: string; label: string }[];
  tipoFinanciamiento: { value: string; label: string }[];
  estadoFinanciero: { value: string; label: string }[];
  monedas: { value: string; label: string }[];
  error: string | null;
}

function mapItems(items: CatalogoItem[]) {
  return items.map((i) => ({ value: i.codigo, label: i.nombre }));
}

export function useCatalogosProyectos(): CatalogosProyectos {
  const [estadoPatente, setEstadoPatente] = useState<{ value: string; label: string }[]>([]);
  const [tipoPatente, setTipoPatente] = useState<{ value: string; label: string }[]>([]);
  const [etapaProducto, setEtapaProducto] = useState<{ value: string; label: string }[]>([]);
  const [tipoProducto, setTipoProducto] = useState<{ value: string; label: string }[]>([]);
  const [tipoFinanciamiento, setTipoFinanciamiento] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [estadoFinanciero, setEstadoFinanciero] = useState<{ value: string; label: string }[]>([]);
  const [monedas, setMonedas] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [
          estado_patente,
          tipo_patente,
          etapa_producto,
          tipo_producto,
          tipo_financiamiento,
          estado_financiero,
          moneda,
        ] = await Promise.all([
          getCatalogos("estado_patente"),
          getCatalogos("tipo_patente"),
          getCatalogos("etapa_producto"),
          getCatalogos("tipo_producto"),
          getCatalogos("tipo_financiamiento"),
          getCatalogos("estado_financiero"),
          getCatalogos("moneda"),
        ]);
        setEstadoPatente(mapItems(estado_patente));
        setTipoPatente(mapItems(tipo_patente));
        setEtapaProducto(mapItems(etapa_producto));
        setTipoProducto(mapItems(tipo_producto));
        setTipoFinanciamiento(mapItems(tipo_financiamiento));
        setEstadoFinanciero(mapItems(estado_financiero));
        setMonedas(mapItems(moneda));
      } catch (err) {
        setError("Error cargando catálogos");
        console.error("useCatalogosProyectos:", err);
      }
    };
    void fetch();
  }, []);

  return {
    estadoPatente,
    tipoPatente,
    etapaProducto,
    tipoProducto,
    tipoFinanciamiento,
    estadoFinanciero,
    monedas,
    error,
  };
}
