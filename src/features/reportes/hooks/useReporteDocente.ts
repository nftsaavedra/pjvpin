import { useCallback, useState } from "react";
import {
  getReporteDocenteIntegral,
  getReportesDocentesIntegral,
  type ReporteDocenteIntegral,
} from "../api";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "@/services/tauri/error";

export function useReporteDocente() {
  const [docenteReport, setDocenteReport] = useState<ReporteDocenteIntegral | null>(null);
  const [docenteReports, setDocenteReports] = useState<ReporteDocenteIntegral[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const generate = useCallback(async (docenteId: string) => {
    if (!docenteId) {
      toast.info("Seleccione un investigador");
      return;
    }
    setGenerating(true);
    setDocenteReport(null);
    setDocenteReports([]);
    try {
      if (docenteId === "__todos__") {
        const reports = await getReportesDocentesIntegral();
        setDocenteReports(reports);
        setExpandedSections({ "doc-perfil-0": true });
        toast.success(`${reports.length} reportes generados`);
      } else {
        const report = await getReporteDocenteIntegral(docenteId);
        setDocenteReport(report);
        setExpandedSections({ "doc-perfil": true });
        toast.success("Reporte de investigador generado");
      }
    } catch (err) {
      toast.error("Error generando reporte: " + getTauriErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    docenteReport,
    docenteReports,
    generating,
    expandedSections,
    toggleSection,
    generate,
  };
}
