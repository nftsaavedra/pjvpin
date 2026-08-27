import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { getDataPureMasterlist } from "@/shared/tauri/reportes";
import { sincronizarPurePersonIds } from "@/shared/tauri/investigadores";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import type { PureMasterlistData } from "@/shared/tauri/types";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonTable } from "@/shared/ui/Skeleton";

interface PureMasterListPanelProps {
  canExport: boolean;
  refreshTrigger?: number;
}

const EMPTY_DATA: PureMasterlistData = {
  persons: [],
  staffRelations: [],
  summary: {
    total: 0,
    actualizacionesPure: 0,
    altasNuevas: 0,
    sinCorreo: 0,
    sinOrcid: 0,
    pureRemotoTotal: 0,
  },
};

export const PureMasterListPanel: React.FC<PureMasterListPanelProps> = ({
  canExport,
  refreshTrigger = 0,
}) => {
  const {
    data,
    loading,
    refreshing,
    error,
    recargar: recargarDatos,
  } = useStableFetchData<PureMasterlistData>(
    () => getDataPureMasterlist(),
    refreshTrigger,
    messages.reportes.pureMasterList.errorCargandoDatos,
    EMPTY_DATA,
  );
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await sincronizarPurePersonIds();
      toast.success(
        messages.reportes.pureMasterList.sincronizarOk(r.matched, r.assigned, r.totalPure),
      );
      await recargarDatos();
    } catch (err: unknown) {
      toast.error(messages.reportes.pureMasterList.sincronizarError(getTauriErrorMessage(err)));
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const mod = await import("../pureMasterListExport");
      const payload = await mod.buildPureMasterListExcel();
      const { saveDesktopFile } = await import("@/shared/utils/saveDesktopFile");
      const saved = await saveDesktopFile({
        suggestedName: payload.suggestedName,
        bytes: payload.bytes,
        filters: [{ name: "Archivo Excel", extensions: ["xlsx"] }],
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (!saved) {
        return;
      }
      toast.success(messages.reportes.pureMasterList.exportarExito);
    } catch (err: unknown) {
      toast.error(messages.reportes.pureMasterList.exportarError(getTauriErrorMessage(err)));
    } finally {
      setExporting(false);
    }
  };

  const summary = data.summary;
  const isBusy = loading || refreshing;

  return (
    <div className="form-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2>{messages.reportes.pureMasterList.titulo}</h2>
          <p className="text-sm text-gray-600 mt-1">{messages.reportes.pureMasterList.subtitulo}</p>
        </div>
      </div>

      {error ? (
        <EmptyState
          variant="error"
          message={messages.reportes.pureMasterList.errorCargandoDatos}
          actionLabel={messages.ui.reintentar}
          onAction={() => {
            void recargarDatos();
          }}
        />
      ) : isBusy && summary.total === 0 ? (
        <SkeletonTable columns={5} rows={2} />
      ) : (
        <div className="form gap-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">
              {messages.reportes.pureMasterList.totalChip(summary.total)}
            </Badge>
            <Badge variant="info">
              {messages.reportes.pureMasterList.actualizacionesChip(summary.actualizacionesPure)}
            </Badge>
            <Badge variant="info">
              {messages.reportes.pureMasterList.altasChip(summary.altasNuevas)}
            </Badge>
            {summary.sinCorreo > 0 && (
              <Badge variant="warning">
                {messages.reportes.pureMasterList.sinCorreoChip(summary.sinCorreo)}
              </Badge>
            )}
            {summary.sinOrcid > 0 && (
              <Badge variant="warning">
                {messages.reportes.pureMasterList.sinOrcidChip(summary.sinOrcid)}
              </Badge>
            )}
            <Badge variant="default">
              {summary.pureRemotoTotal > 0
                ? messages.reportes.pureMasterList.pureRemotoChip(summary.pureRemotoTotal)
                : messages.reportes.pureMasterList.pureRemotoSinDato}
            </Badge>
          </div>

          <p className="text-sm text-gray-700">
            {messages.reportes.pureMasterList.exportarDescripcion}
          </p>

          {canExport && (
            <div className="flex flex-wrap gap-3">
              <button
                className="btn-primary"
                onClick={() => {
                  void handleExport();
                }}
                disabled={exporting || syncing || summary.total === 0}
                data-testid="pure-masterlist-exportar"
              >
                <span className="button-with-icon">
                  <AppIcon icon={Download} size={18} />
                  <span>
                    {exporting
                      ? messages.reportes.pureMasterList.exportando
                      : messages.reportes.pureMasterList.exportar}
                  </span>
                </span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  void handleSync();
                }}
                disabled={syncing || exporting}
                data-testid="pure-masterlist-sincronizar"
              >
                <span className="button-with-icon">
                  <AppIcon icon={RefreshCw} size={18} />
                  <span>
                    {syncing
                      ? messages.reportes.pureMasterList.sincronizando
                      : messages.reportes.pureMasterList.sincronizarBoton}
                  </span>
                </span>
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            {messages.reportes.pureMasterList.sincronizarDescripcion}
          </p>
        </div>
      )}
    </div>
  );
};
