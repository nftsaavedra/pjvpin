import { useRecursoCrud } from "@/shared/hooks/useRecursoCrud";
import {
  crearPatente,
  getPatentesProyecto,
  eliminarPatente,
  crearProducto,
  getProductosProyecto,
  eliminarProducto,
  crearEquipamiento,
  getEquipamientosProyecto,
  eliminarEquipamiento,
  crearFinanciamiento,
  getFinanciamientosProyecto,
  eliminarFinanciamiento,
  type CreatePatentePayload,
  type CreateProductoPayload,
  type CreateEquipamientoPayload,
  type CreateFinanciamientoPayload,
} from "@/services/tauri/recursos";
import type { Patente, Producto, Equipamiento, Financiamiento } from "@/services/tauri/types";

export const useProyectosRecursos = (proyectoId: string | undefined) => {
  const patentesCrud = useRecursoCrud<Patente, CreatePatentePayload>(
    getPatentesProyecto,
    crearPatente,
    eliminarPatente,
    (raw, pid) => ({
      proyecto_id: pid,
      titulo: (raw.titulo_patente as string) || (raw.titulo as string) || "",
      numero_patente: raw.numero_patente as string,
      estado: raw.estado as string,
    }),
    (p) => p.id_patente,
    proyectoId,
  );

  const productosCrud = useRecursoCrud<Producto, CreateProductoPayload>(
    getProductosProyecto,
    crearProducto,
    eliminarProducto,
    (raw, pid) => ({
      proyecto_id: pid,
      nombre: (raw.nombre_producto as string) || (raw.nombre as string) || "",
      tipo: raw.tipo as string,
      etapa: raw.etapa as string,
      descripcion: raw.descripcion as string,
    }),
    (p) => p.id_producto,
    proyectoId,
  );

  const equipamientosCrud = useRecursoCrud<Equipamiento, CreateEquipamientoPayload>(
    getEquipamientosProyecto,
    crearEquipamiento,
    eliminarEquipamiento,
    (raw, pid) => ({
      proyecto_id: pid,
      nombre: (raw.nombre_equipo as string) || (raw.nombre as string) || "",
      descripcion: raw.descripcion as string,
      especificaciones: raw.especificaciones as string,
      valor_estimado: raw.costo as number,
    }),
    (e) => e.id_equipamiento,
    proyectoId,
  );

  const financiamientosCrud = useRecursoCrud<Financiamiento, CreateFinanciamientoPayload>(
    getFinanciamientosProyecto,
    crearFinanciamiento,
    eliminarFinanciamiento,
    (raw, pid) => ({
      proyecto_id: pid,
      entidad_financiadora: (raw.fuente as string) || (raw.entidad_financiadora as string) || "",
      tipo: raw.tipo as string,
      monto: raw.monto as number,
      estado_financiero: raw.estado_financiero as string,
    }),
    (f) => f.id_financiamiento,
    proyectoId,
  );

  const cargarRecursos = async (pid: string): Promise<void> => {
    await Promise.all([
      patentesCrud.loadItems(pid),
      productosCrud.loadItems(pid),
      equipamientosCrud.loadItems(pid),
      financiamientosCrud.loadItems(pid),
    ]);
  };

  const resetearRecursos = (): void => {
    patentesCrud.resetItems();
    productosCrud.resetItems();
    equipamientosCrud.resetItems();
    financiamientosCrud.resetItems();
  };

  const crearRecursosParaProyecto = async (pid: string): Promise<void> => {
    const promesas: Promise<unknown>[] = [];
    for (const item of patentesCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearPatente({
          proyecto_id: pid,
          titulo: (item.titulo_patente as string) || (item.titulo as string) || "",
          numero_patente: item.numero_patente as string,
          estado: item.estado as string,
        }).catch(() => null),
      );
    }
    for (const item of productosCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearProducto({
          proyecto_id: pid,
          nombre: (item.nombre_producto as string) || (item.nombre as string) || "",
          tipo: item.tipo as string,
          etapa: item.etapa as string,
          descripcion: item.descripcion as string,
        }).catch(() => null),
      );
    }
    for (const item of equipamientosCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearEquipamiento({
          proyecto_id: pid,
          nombre: (item.nombre_equipo as string) || (item.nombre as string) || "",
          descripcion: item.descripcion as string,
          especificaciones: item.especificaciones as string,
          valor_estimado: item.costo as number,
        }).catch(() => null),
      );
    }
    for (const item of financiamientosCrud.items as unknown as Array<Record<string, unknown>>) {
      promesas.push(
        crearFinanciamiento({
          proyecto_id: pid,
          entidad_financiadora:
            (item.fuente as string) || (item.entidad_financiadora as string) || "",
          tipo: item.tipo as string,
          monto: item.monto as number,
          estado_financiero: item.estado_financiero as string,
        }).catch(() => null),
      );
    }
    if (promesas.length > 0) {
      await Promise.all(promesas);
    }
  };

  return {
    patentes: patentesCrud.items,
    productos: productosCrud.items,
    equipamientos: equipamientosCrud.items,
    financiamientos: financiamientosCrud.items,
    handlePatentesChange: patentesCrud.handleChange,
    handleProductosChange: productosCrud.handleChange,
    handleEquipamientosChange: equipamientosCrud.handleChange,
    handleFinanciamientosChange: financiamientosCrud.handleChange,
    cargarRecursos,
    resetearRecursos,
    crearRecursosParaProyecto,
  } as const;
};
