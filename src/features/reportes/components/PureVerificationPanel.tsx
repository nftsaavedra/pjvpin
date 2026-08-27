import React, { useEffect, useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import {
  listSyncReports,
  sincronizarPublicacionesPure,
  verificarDiferenciasPure,
} from "@/shared/tauri/pure";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import type {
  Investigador,
  ItemClasificacion,
  SyncReport,
  SyncReportItem,
} from "@/shared/tauri/types";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { FormSelect } from "@/shared/forms/FormSelect";

interface PureVerificationPanelProps {
  investigadores: Investigador[];
  canView: boolean;
  canManage: boolean;
}

const CLASIFICACION_VARIANT: Record<ItemClasificacion, "warning" | "info"> = {
  solo_local: "warning",
  solo_pure: "info",
  diferente: "info",
};

const CLASIFICACION_LABEL: Record<ItemClasificacion, string> = {
  solo_local: messages.reportes.pureVerification.clasificaciones.soloLocal,
  solo_pure: messages.reportes.pureVerification.clasificaciones.soloPure,
  diferente: messages.reportes.pureVerification.clasificaciones.diferente,
};

export const PureVerificationPanel: React.FC<PureVerificationPanelProps> = ({
  investigadores,
  canView,
  canManage,
}) => {
  const [investigadorId, setInvestigadorId] = useState("");
  const [report, setReport] = useState<SyncReport | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [adoptando, setAdoptando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canView) {
      return;
    }
    listSyncReports("pure_diff", 1)
      .then((previos) => {
        setReport(previos[0] ?? null);
      })
      .catch(() => {
        // El historial es informativo: su ausencia no bloquea la verificacion.
        setReport(null);
      });
  }, [canView]);

  const verificar = async () => {
    setVerificando(true);
    setError(false);
    try {
      setReport(await verificarDiferenciasPure(investigadorId || undefined));
    } catch (err: unknown) {
      setError(true);
      toast.error(
        `${messages.reportes.pureVerification.errorCargando} ${getTauriErrorMessage(err)}`,
      );
    } finally {
      setVerificando(false);
    }
  };

  const adoptar = async () => {
    if (!investigadorId) {
      return;
    }
    setAdoptando(true);
    try {
      await sincronizarPublicacionesPure(investigadorId);
      toast.success(messages.reportes.pureVerification.adoptarExito);
      setReport(await verificarDiferenciasPure(investigadorId));
    } catch (err: unknown) {
      toast.error(messages.reportes.pureVerification.adoptarError(getTauriErrorMessage(err)));
    } finally {
      setAdoptando(false);
    }
  };

  const opciones = [
    { value: "", label: messages.reportes.todosLosInvestigadores },
    ...investigadores.map((inv) => ({
      value: inv.idInvestigador,
      label: inv.nombresApellidos,
    })),
  ];
  const ocupado = verificando || adoptando;
  const puedeAdoptar = canManage && investigadorId !== "";

  return (
    <section className="card p-6 space-y-4" aria-labelledby="pure-verification-titulo">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 id="pure-verification-titulo" className="text-lg font-semibold text-gray-900">
              {messages.reportes.pureVerification.titulo}
            </h2>
            <FieldHelpTooltip
              label={messages.reportes.pureVerification.helpLabel}
              content={messages.reportes.pureVerification.helpContent}
            />
          </div>
          <p className="text-sm text-gray-600">{messages.reportes.pureVerification.subtitulo}</p>
        </div>
        {report ? (
          <Badge variant="default">
            {messages.reportes.pureVerification.ejecutadoEn(
              new Date(report.ejecutadoAt).toLocaleString(),
            )}
          </Badge>
        ) : null}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <FormSelect
          label={messages.reportes.pureVerification.investigadorLabel}
          value={investigadorId}
          onChange={setInvestigadorId}
          options={opciones}
          disabled={ocupado}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              void verificar();
            }}
            disabled={!canView || ocupado}
            aria-busy={verificando}
            data-testid="pure-verification-verificar"
          >
            <span className="button-with-icon">
              <AppIcon icon={RefreshCw} size={16} />
              <span>
                {verificando
                  ? messages.reportes.pureVerification.verificando
                  : report
                    ? messages.reportes.pureVerification.botonReverificar
                    : messages.reportes.pureVerification.botonVerificar}
              </span>
            </span>
          </button>
          {puedeAdoptar ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void adoptar();
              }}
              disabled={ocupado || !report?.items.some((it) => it.idPure)}
              aria-busy={adoptando}
              data-testid="pure-verification-adoptar"
            >
              <span className="button-with-icon">
                <AppIcon icon={Download} size={16} />
                <span>
                  {adoptando
                    ? messages.reportes.pureVerification.adoptando
                    : messages.reportes.pureVerification.adoptar}
                </span>
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <EmptyState
          variant="error"
          message={messages.reportes.pureVerification.errorCargando}
          actionLabel={messages.ui.reintentar}
          onAction={() => {
            void verificar();
          }}
        />
      ) : verificando ? (
        <SkeletonTable columns={5} rows={3} />
      ) : report ? (
        <ReporteDetalle report={report} />
      ) : (
        <EmptyState variant="empty" message={messages.reportes.pureVerification.sinVerificacion} />
      )}
    </section>
  );
};

const ReporteDetalle: React.FC<{ report: SyncReport }> = ({ report }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">
        {messages.reportes.pureVerification.resumen.total(report.resumen.total)}
      </Badge>
      <Badge variant="warning">
        {messages.reportes.pureVerification.resumen.soloLocal(report.resumen.soloLocal)}
      </Badge>
      <Badge variant="info">
        {messages.reportes.pureVerification.resumen.soloPure(report.resumen.soloPure)}
      </Badge>
      <Badge variant="info">
        {messages.reportes.pureVerification.resumen.diferentes(report.resumen.diferentes)}
      </Badge>
    </div>
    {report.items.length === 0 ? (
      <EmptyState variant="empty" message={messages.reportes.pureVerification.sinDiferencias} />
    ) : (
      <ItemsTabla items={report.items} />
    )}
  </div>
);

const ItemsTabla: React.FC<{ items: SyncReportItem[] }> = ({ items }) => (
  <div className="overflow-x-auto border border-gray-200 rounded-lg">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          <Th label={messages.reportes.pureVerification.columnas.clasificacion} />
          <Th label={messages.reportes.pureVerification.columnas.titulo} />
          <Th label={messages.reportes.pureVerification.columnas.anio} />
          <Th label={messages.reportes.pureVerification.columnas.doi} />
          <Th label={messages.reportes.pureVerification.columnas.diferencias} />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((it, idx) => (
          <tr key={`${it.idLocal ?? it.idPure ?? "item"}-${idx}`}>
            <Td>
              <Badge variant={CLASIFICACION_VARIANT[it.clasificacion]}>
                {CLASIFICACION_LABEL[it.clasificacion]}
              </Badge>
            </Td>
            <Td>
              <span className="text-gray-800">{it.titulo ?? "-"}</span>
            </Td>
            <Td>
              <span className="text-gray-700">{it.anio ?? "-"}</span>
            </Td>
            <Td>
              <code className="text-xs text-gray-600">{it.doi ?? "-"}</code>
            </Td>
            <Td>
              {it.diferencias.length === 0 ? (
                <span className="text-gray-400">-</span>
              ) : (
                <span className="text-xs text-amber-800">
                  {messages.reportes.pureVerification.diferenciasLabel(it.diferencias)}
                </span>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Th: React.FC<{ label: string }> = ({ label }) => (
  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
    {label}
  </th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 align-top">{children}</td>
);
