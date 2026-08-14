import { useRecursoCrud } from "@/shared/hooks/useRecursoCrud";
import {
  crearPatente,
  getPatentesProyecto,
  eliminarPatente,
  crearSoftware,
  getSoftwareProyecto,
  eliminarSoftware,
  crearEquipamiento,
  getEquipamientosProyecto,
  eliminarEquipamiento,
  crearFinanciamiento,
  getFinanciamientosProyecto,
  eliminarFinanciamiento,
  type CreatePatentePayload,
  type CreateSoftwarePayload,
  type CreateEquipamientoPayload,
  type CreateFinanciamientoPayload,
} from "@/shared/tauri/recursos";
import type {
  Patente,
  Producto,
  Equipamiento,
  Financiamiento,
} from "@/shared/tauri/types";

export const useProyectosRecursos = (proyectoId: string | undefined) => {
  const patentesCrud = useRecursoCrud<Patente, CreatePatentePayload>(
    getPatentesProyecto,
    crearPatente,
    eliminarPatente,
    (raw, pid) => ({
      proyectoId: pid,
      titulo: (raw.titulo_patente as string) || (raw.titulo as string) || "",
      numeroPatente: raw.numero_patente as string,
      estado: raw.estado as string,
    }),
    (p) => p.id_patente,
    proyectoId,
  );

  // D5: productos -> publicaciones tipo=software. `Producto` se mantiene
  // como alias type de `PublicacionCientifica` para no romper consumidores
  // que ya usaban `productos` como nombre de variable.
  const softwareCrud = useRecursoCrud<Producto, CreateSoftwarePayload>(
    getSoftwareProyecto,
    crearSoftware,
    eliminarSoftware,
    (raw, pid) => ({
      idProyecto: pid,
      titulo: (raw.titulo as string) || "",
      tipo: "software",
      resumen: raw.descripcion as string,
      doi: raw.doi as string,
      fechaPublicacion: raw.fecha_registro as number,
    }),
    (s) => s.id_publicacion,
    proyectoId,
  );

  const equipamientosCrud = useRecursoCrud<Equipamiento, CreateEquipamientoPayload>(
    getEquipamientosProyecto,
    crearEquipamiento,
    eliminarEquipamiento,
    (raw) => ({
      nombre: (raw.nombre_equipo as string) || (raw.nombre as string) || "",
      descripcion: raw.descripcion as string,
      especificaciones: raw.especificaciones as string,
      valorEstimado: raw.costo as number,
    }),
    (e) => e.id_equipamiento,
    proyectoId,
  );

  const financiamientosCrud = useRecursoCrud<Financiamiento, CreateFinanciamientoPayload>(
    getFinanciamientosProyecto,
    crearFinanciamiento,
    eliminarFinanciamiento,
    (raw, pid) => ({
      codigo: (raw.codigo as string) || `FIN-${pid}`,
      nombre: (raw.fuente as string) || (raw.entidad_financiadora as string) || "",
      tipo: raw.tipo as string,
      monto: raw.monto as number,
      estadoFinanciero: raw.estadoFinanciero as string,
    }),
    (f) => f.id_financiamiento,
    proyectoId,
  );

  const cargarRecursos = async (pid: string): Promise<void> => {
    await Promise.all([
      patentesCrud.loadItems(pid),
      softwareCrud.loadItems(pid),
      equipamientosCrud.loadItems(pid),
      financiamientosCrud.loadItems(pid),
    ]);
  };

  const resetearRecursos = (): void => {
    patentesCrud.resetItems();
    softwareCrud.resetItems();
    equipamientosCrud.resetItems();
    financiamientosCrud.resetItems();
  };

  const crearRecursosParaProyecto = async (pid: string): Promise<void> => {
    const promesas: Promise<unknown>[] = [];
    for (const item of patentesCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearPatente({
          proyectoId: pid,
          titulo: (item.titulo_patente as string) || (item.titulo as string) || "",
          numeroPatente: item.numero_patente as string,
          estado: item.estado as string,
        }).catch(() => null),
      );
    }
    for (const item of softwareCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearSoftware({
          idProyecto: pid,
          titulo: (item.titulo as string) || (item.nombre as string) || "",
          tipo: "software",
          resumen: item.descripcion as string,
          doi: item.doi as string,
        }).catch(() => null),
      );
    }
    for (const item of equipamientosCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearEquipamiento({
          nombre: (item.nombre_equipo as string) || (item.nombre as string) || "",
          descripcion: item.descripcion as string,
          especificaciones: item.especificaciones as string,
          valorEstimado: item.costo as number,
        }).catch(() => null),
      );
    }
    for (const item of financiamientosCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearFinanciamiento({
          codigo: (item.codigo as string) || `FIN-${pid}`,
          nombre: (item.fuente as string) || (item.entidad_financiadora as string) || "",
          tipo: item.tipo as string,
          monto: item.monto as number,
          estadoFinanciero: item.estadoFinanciero as string,
        }).catch(() => null),
      );
    }
    if (promesas.length > 0) {
      await Promise.all(promesas);
    }
  };

  return {
    patentes: patentesCrud.items,
    /// Alias de `software` para preservar compatibilidad con consumidores
    /// que esperan `productos`. El shape es PublicacionCientifica.
    productos: softwareCrud.items,
    software: softwareCrud.items,
    equipamientos: equipamientosCrud.items,
    financiamientos: financiamientosCrud.items,
    patentesNormalizados: patentesCrud.items.map((p) => ({ ...p, id: p.id_patente })),
    productosNormalizados: softwareCrud.items.map((s) => ({
      ...s,
      id: s.id_publicacion,
    })),
    equipamientosNormalizados: equipamientosCrud.items.map((e) => ({
      ...e,
      id: e.id_equipamiento,
    })),
    financiamientosNormalizados: financiamientosCrud.items.map((f) => ({
      ...f,
      id: f.id_financiamiento,
    })),
    handlePatentesChange: patentesCrud.handleChange,
    handleProductosChange: softwareCrud.handleChange,
    handleSoftwareChange: softwareCrud.handleChange,
    handleEquipamientosChange: equipamientosCrud.handleChange,
    handleFinanciamientosChange: financiamientosCrud.handleChange,
    cargarRecursos,
    resetearRecursos,
    crearRecursosParaProyecto,
  } as const;
};
