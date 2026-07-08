import { useState } from "react";
import ExcelJS from "exceljs";
import { pdf } from "@react-pdf/renderer";
import { saveDesktopFile } from "@/shared/utils/saveDesktopFile";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "../api";
import { ProyectoIntegralPdf, InvestigadorIntegralPdf } from "../components/PdfComponents";
import type { ReporteProyectoIntegral, ReporteDocenteIntegral } from "../api";

type ExportState =
  "proyecto-xlsx" | "proyecto-pdf" | "investigador-xlsx" | "investigador-pdf" | null;

interface UseExportParams {
  proyectoReport: ReporteProyectoIntegral | null;
  investigadorReport: ReporteDocenteIntegral | null;
  investigadorReports: ReporteDocenteIntegral[];
}

export function useExport({
  proyectoReport,
  investigadorReport,
  investigadorReports,
}: UseExportParams) {
  const [exportingIntegral, setExportingIntegral] = useState<ExportState>(null);

  const exportProyectoXLSX = async () => {
    if (!proyectoReport) return;
    setExportingIntegral("proyecto-xlsx");
    try {
      const wb = new ExcelJS.Workbook();

      const addSheet = (name: string, rows: object[]) => {
        const ws = wb.addWorksheet(name);
        if (rows.length === 0) {
          ws.addRow(["Sin datos"]).commit();
          return;
        }
        ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 24 }));
        for (const r of rows) {
          ws.addRow(r);
        }
      };

      addSheet("Cabecera", [
        {
          ...proyectoReport.cabecera,
          programas_relacionados: proyectoReport.cabecera.programas_relacionados.join(", "),
        },
      ]);
      addSheet("Equipo", proyectoReport.equipo);
      addSheet("Patentes", proyectoReport.patentes);
      addSheet("Productos", proyectoReport.productos);
      addSheet("Equipamientos", proyectoReport.equipamientos);
      addSheet("Financiamiento", proyectoReport.financiamientos);

      const wsResumen = wb.addWorksheet("Resumen Financiero");
      wsResumen
        .addRow(["Total Financiamientos", proyectoReport.resumen_financiero.total_financiamientos])
        .commit();
      wsResumen.addRow([]);
      wsResumen.addRow(["Desglose por Moneda"]);
      wsResumen.addRow(["Moneda", "Cantidad", "Monto Total"]);
      for (const d of proyectoReport.resumen_financiero.desglose_por_moneda) {
        wsResumen.addRow([d.moneda_nombre, d.cantidad, d.monto_total]);
      }
      wsResumen.addRow([]);
      wsResumen.addRow(["Desglose por Estado"]);
      wsResumen.addRow(["Estado", "Cantidad"]);
      for (const d of proyectoReport.resumen_financiero.desglose_por_estado) {
        wsResumen.addRow([d.estado_nombre, d.cantidad]);
      }
      wsResumen.commit();

      const buffer = await wb.xlsx.writeBuffer();
      const date = new Date().toISOString().split("T")[0];
      await saveDesktopFile({
        suggestedName: `reporte-proyecto-integral-${date}.xlsx`,
        bytes: new Uint8Array(buffer),
        filters: [{ name: "Archivo Excel", extensions: ["xlsx"] }],
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      toast.success("Excel exportado exitosamente");
    } catch (err) {
      toast.error("Error exportando Excel: " + getTauriErrorMessage(err));
    } finally {
      setExportingIntegral(null);
    }
  };

  const exportProyectoPDF = async () => {
    if (!proyectoReport) return;
    setExportingIntegral("proyecto-pdf");
    try {
      const blob = await pdf(<ProyectoIntegralPdf report={proyectoReport} />).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const date = new Date().toISOString().split("T")[0];
      await saveDesktopFile({
        suggestedName: `reporte-proyecto-integral-${date}.pdf`,
        bytes,
        filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
        mimeType: "application/pdf",
      });
      toast.success("PDF exportado exitosamente");
    } catch (err) {
      toast.error("Error exportando PDF: " + getTauriErrorMessage(err));
    } finally {
      setExportingIntegral(null);
    }
  };

  const exportInvestigadorXLSX = async () => {
    if (!investigadorReport && investigadorReports.length === 0) return;
    setExportingIntegral("investigador-xlsx");
    try {
      const wb = new ExcelJS.Workbook();
      const reports = investigadorReport ? [investigadorReport] : investigadorReports;

      for (const rep of reports) {
        const name = rep.perfil.nombres_apellidos.substring(0, 31);
        const addSheet = (suffix: string, rows: object[]) => {
          const ws = wb.addWorksheet(`${name}_${suffix}`);
          if (rows.length === 0) {
            ws.addRow(["Sin datos"]).commit();
            return;
          }
          ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 24 }));
          for (const r of rows) {
            ws.addRow(r);
          }
        };

        addSheet("Perfil", [{ ...rep.perfil }]);
        addSheet(
          "Proyectos",
          rep.proyectos.map((p) => ({
            ...p,
            colegas: p.colegas.map((c) => c.nombres_apellidos).join("; "),
            programas_relacionados: p.programas_relacionados.join(", "),
          })),
        );
        addSheet("Patentes", rep.recursos.patentes);
        addSheet("Productos", rep.recursos.productos);
        addSheet("Equipamientos", rep.recursos.equipamientos);
        addSheet("Publicaciones", rep.publicaciones);
        addSheet("Trazabilidad", [{ ...rep.trazabilidad }]);
      }

      const buffer = await wb.xlsx.writeBuffer();
      const date = new Date().toISOString().split("T")[0];
      await saveDesktopFile({
        suggestedName: `reporte-investigador-integral-${date}.xlsx`,
        bytes: new Uint8Array(buffer),
        filters: [{ name: "Archivo Excel", extensions: ["xlsx"] }],
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      toast.success("Excel exportado exitosamente");
    } catch (err) {
      toast.error("Error exportando Excel: " + getTauriErrorMessage(err));
    } finally {
      setExportingIntegral(null);
    }
  };

  const exportInvestigadorPDF = async () => {
    if (!investigadorReport && investigadorReports.length === 0) return;
    setExportingIntegral("investigador-pdf");
    try {
      const reports = investigadorReport ? [investigadorReport] : investigadorReports;
      for (const rep of reports) {
        const blob = await pdf(<InvestigadorIntegralPdf report={rep} />).toBlob();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const date = new Date().toISOString().split("T")[0];
        const name = rep.perfil.nombres_apellidos.replace(/\s+/g, "_").substring(0, 40);
        await saveDesktopFile({
          suggestedName:
            reports.length === 1
              ? `reporte-investigador-integral-${date}.pdf`
              : `reporte-investigador-${name}-${date}.pdf`,
          bytes,
          filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
          mimeType: "application/pdf",
        });
      }
      toast.success("PDF exportado exitosamente");
    } catch (err) {
      toast.error("Error exportando PDF: " + getTauriErrorMessage(err));
    } finally {
      setExportingIntegral(null);
    }
  };

  return {
    exportProyectoXLSX,
    exportInvestigadorXLSX,
    exportProyectoPDF,
    exportInvestigadorPDF,
    exportingIntegral,
    setExportingIntegral,
  };
}
