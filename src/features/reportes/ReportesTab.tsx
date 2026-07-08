import React, { useState } from "react";
import {
  getDataExportacionAgrupada,
  getTauriErrorMessage,
  type DatosExportDocenteAgrupado,
} from "./api";
import { getAllProyectosDetalle } from "@/services/tauri/proyectos";
import { getAllInvestigadores } from "@/services/tauri/investigadores";
import type { Investigador, ProyectoDetalle } from "@/services/tauri/types";
import { toast } from "@/services/toast";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { saveDesktopFile } from "@/shared/utils/saveDesktopFile";
import { ExportPreviewPanel } from "./components/ExportPreviewPanel";
import { ReporteProyectoPanel } from "./components/ReporteProyectoPanel";
import { ReporteDocentePanel } from "./components/ReporteDocentePanel";

interface ReportesTabProps {
  canExport?: boolean;
  refreshTrigger?: number;
}

export const ReportesTab: React.FC<ReportesTabProps> = ({
  canExport = true,
  refreshTrigger = 0,
}) => {
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "pdf" | null>(null);

  const {
    data: preview,
    loading,
    refreshing,
    error,
    recargar: cargarPreview,
  } = useStableFetchData<DatosExportDocenteAgrupado[]>(
    () => getDataExportacionAgrupada(),
    refreshTrigger,
    "Error cargando vista previa de reportes",
    [],
  );

  useRefreshToast({
    refreshing,
    message: "Actualizando vista previa de reportes",
    toastKey: "reportes-refresh",
    cooldownMs: 120000,
  });

  const [proyectos, setProyectos] = useState<ProyectoDetalle[]>([]);
  const [proyectosLoading, setProyectosLoading] = useState(true);
  const [investigadores, setInvestigadores] = useState<Investigador[]>([]);
  const [investigadoresLoading, setInvestigadoresLoading] = useState(true);

  React.useEffect(() => {
    getAllProyectosDetalle()
      .then(setProyectos)
      .catch(() => {
        toast.error("Error cargando proyectos");
      })
      .finally(() => {
        setProyectosLoading(false);
      });
  }, []);

  React.useEffect(() => {
    getAllInvestigadores()
      .then(setInvestigadores)
      .catch(() => {
        toast.error("Error cargando investigadores");
      })
      .finally(() => {
        setInvestigadoresLoading(false);
      });
  }, []);

  const exportar = async (format: "xlsx" | "pdf") => {
    setExportingFormat(format);
    try {
      const exportPayload =
        format === "xlsx"
          ? await import("./reportExport").then(({ buildExcelReport }) =>
              buildExcelReport("agrupado_investigador"),
            )
          : await import("./reportExportPdf").then(({ buildPdfReport }) =>
              buildPdfReport("agrupado_investigador"),
            );

      const savedFilePath = await saveDesktopFile({
        suggestedName: exportPayload.suggestedName,
        bytes: exportPayload.bytes,
        filters: [
          {
            name: format === "xlsx" ? "Archivo Excel" : "Documento PDF",
            extensions: [format],
          },
        ],
        mimeType:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      if (!savedFilePath) {
        toast.info("Exportación cancelada");
        return;
      }

      toast.success(`Reporte ${format === "xlsx" ? "Excel" : "PDF"} exportado exitosamente`);
    } catch (err) {
      toast.error("Error exportando reporte: " + getTauriErrorMessage(err));
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="tab-panel module-shell reportes-module">
      <ExportPreviewPanel
        preview={preview}
        loading={loading}
        error={error}
        canExport={canExport}
        exportingFormat={exportingFormat}
        onExport={(fmt) => void exportar(fmt)}
        onRetry={() => void cargarPreview()}
      />

      <ReporteProyectoPanel proyectos={proyectos} proyectosLoading={proyectosLoading} />

      <ReporteDocentePanel docentes={investigadores} docentesLoading={investigadoresLoading} />
    </div>
  );
};
