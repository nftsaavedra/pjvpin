import { useCallback, useState } from "react";
import {
  getReporteInvestigadorIntegral,
  getReportesInvestigadoresIntegral,
  type ReporteInvestigadorIntegral,
} from "../api";
import { toast } from "@/shared/feedback/toast";
import { getTauriErrorMessage } from "@/shared/tauri/error";

export function useReporteInvestigador() {
  const [investigadorReport, setInvestigadorReport] = useState<ReporteInvestigadorIntegral | null>(
    null,
  );
  const [investigadorReports, setInvestigadorReports] = useState<ReporteInvestigadorIntegral[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const generate = useCallback(async (investigadorId: string) => {
    if (!investigadorId) {
      toast.info("Seleccione un investigador");
      return;
    }
    setGenerating(true);
    setInvestigadorReport(null);
    setInvestigadorReports([]);
    try {
      if (investigadorId === "__todos__") {
        const reports = await getReportesInvestigadoresIntegral();
        setInvestigadorReports(reports);
        setExpandedSections({ "inv-perfil-0": true });
        toast.success(`${reports.length} reportes generados`);
      } else {
        const report = await getReporteInvestigadorIntegral(investigadorId);
        setInvestigadorReport(report);
        setExpandedSections({ "inv-perfil": true });
        toast.success("Reporte de investigador generado");
      }
    } catch (err) {
      toast.error("Error generando reporte: " + getTauriErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    investigadorReport,
    investigadorReports,
    generating,
    expandedSections,
    toggleSection,
    generate,
  };
}
