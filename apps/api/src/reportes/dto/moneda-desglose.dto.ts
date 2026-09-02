/**
 * Sub-DTOs del resumen financiero de `ReporteProyectoIntegral`.
 *
 * Port 1:1 de `ResumenFinanciero` / `MonedaDesglose` / `EstadoDesglose`
 * (`apps/desktop/src-tauri/src/reportes/dto.rs` L114-134). Viven en su propio
 * archivo porque son la unica agregacion calculada del reporte integral
 * (SRP: `integral.dto.ts` describe la entidad, este archivo su desglose).
 */

export class MonedaDesglose {
  moneda_codigo!: string;
  moneda_nombre!: string;
  cantidad!: number;
  monto_total!: number;
}

export class EstadoDesglose {
  estado_codigo!: string;
  estado_nombre!: string;
  cantidad!: number;
}

export class ResumenFinanciero {
  total_financiamientos!: number;
  desglose_por_moneda!: MonedaDesglose[];
  desglose_por_estado!: EstadoDesglose[];
}
