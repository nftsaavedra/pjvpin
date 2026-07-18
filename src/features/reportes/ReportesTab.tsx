import React, { useState } from "react";
import {
  getDataExportacionAgrupada,
  getTauriErrorMessage,
  type DatosExportInvestigadorAgrupado,
} from "./api";
import { getAllProyectosDetalle } from "@/shared/tauri/proyectos";
import { getAllInvestigadores } from "@/shared/tauri/investigadores";
import type { Investigador, ProyectoDetalle } from "@/shared/tauri/types";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { saveDesktopFile } from "@/shared/utils/saveDesktopFile";
import { ExportPreviewPanel } from "./components/ExportPreviewPanel";
import { ReporteProyectoPanel } from "./components/ReporteProyectoPanel";
import { ReporteInvestigadorPanel } from "./components/ReporteInvestigadorPanel";

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
  } = useStableFetchData<DatosExportInvestigadorAgrupado[]>(
    () => getDataExportacionAgrupada(),
    refreshTrigger,
    messages.reportes.tab.errorCargandoVistaPrevia,
    [],
  );

  useRefreshToast({
    refreshing,
    message: messages.reportes.tab.refreshMessage,
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
        toast.error(messages.reportes.tab.errorCargandoProyectos);
      })
      .finally(() => {
        setProyectosLoading(false);
      });
  }, []);

  React.useEffect(() => {
    getAllInvestigadores()
      .then(setInvestigadores)
      .catch(() => {
        toast.error(messages.reportes.tab.errorCargandoInvestigadores);
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
        toast.info(messages.reportes.tab.exportacionCancelada);
        return;
      }

      toast.success(
        messages.reportes.tab.reporteExportado(
          format === "xlsx" ? messages.reportes.tab.formatoExcel : messages.reportes.tab.formatoPdf,
        ),
      );
    } catch (err) {
      toast.error(messages.reportes.tab.errorExportandoReporte(getTauriErrorMessage(err)));
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

      <ReporteInvestigadorPanel
        investigadores={investigadores}
        investigadoresLoading={investigadoresLoading}
      />
    </div>
  );
};
