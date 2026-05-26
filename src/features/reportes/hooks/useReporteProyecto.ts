import { useCallback, useState } from "react";
import { getReporteProyectoIntegral, type ReporteProyectoIntegral } from "../api";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "@/services/tauri/error";

export function useReporteProyecto() {
  const [proyectoReport, setProyectoReport] = useState<ReporteProyectoIntegral | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const generate = useCallback(async (proyectoId: string) => {
    if (!proyectoId) {
      toast.info("Seleccione un proyecto");
      return;
    }
    setGenerating(true);
    setProyectoReport(null);
    try {
      const report = await getReporteProyectoIntegral(proyectoId);
      setProyectoReport(report);
      setExpandedSections({ "proy-cabecera": true });
      toast.success("Reporte de proyecto generado");
    } catch (err) {
      toast.error("Error generando reporte: " + getTauriErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, []);

  return { proyectoReport, generating, expandedSections, toggleSection, generate };
}
