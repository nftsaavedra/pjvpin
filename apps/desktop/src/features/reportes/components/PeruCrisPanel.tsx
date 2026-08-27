import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download, RefreshCw, Send, AlertCircle } from "lucide-react";
import { useEnviarPeruCris } from "@/features/reportes/hooks/useEnviarPeruCris";
import type {
  PeruCrisImportResult,
  PeruCrisValidationItem,
  PeruCrisValidationReport,
  ValidationTipo,
} from "@/features/reportes/api";
import { importarInicialesPeruCris } from "@/features/reportes/api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { SkeletonBlock } from "@/shared/ui/Skeleton";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { getTauriErrorMessage } from "@/shared/tauri/error";

interface PeruCrisPanelProps {
  canExport?: boolean;
}

export const PeruCrisPanel: React.FC<PeruCrisPanelProps> = ({ canExport = false }) => {
  const { state, enviar, validar } = useEnviarPeruCris();
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [importResult, setImportResult] = useState<PeruCrisImportResult | null>(null);
  const [importando, setImportando] = useState(false);
  const [confirmarImportOpen, setConfirmarImportOpen] = useState(false);

  const onEnviar = async () => {
    await enviar();
  };

  const onValidar = async () => {
    await validar("todo");
  };

  const onImportConfirmado = async () => {
    setConfirmarImportOpen(false);
    setImportando(true);
    try {
      const result = await importarInicialesPeruCris();
      setImportResult(result);
      toast.success(
        `PeruCRIS: ${result.proyectos.importados} proyectos, ${result.publicaciones.importados} publicaciones, ${result.publicaciones.autoresVinculados} autores`,
      );
    } catch (err) {
      toast.error(messages.perucris.importar.error(getTauriErrorMessage(err)));
    } finally {
      setImportando(false);
    }
  };

  const isLoading = state.fase === "pushing" || state.fase === "validating" || importando;

  return (
    <section className="card p-6 space-y-4" aria-labelledby="perucris-panel-titulo">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 id="perucris-panel-titulo" className="text-lg font-semibold text-gray-900">
              {messages.perucris.panel.titulo}
            </h2>
            <FieldHelpTooltip
              label={messages.perucris.panel.helpLabel}
              content={messages.perucris.panel.helpContent}
            />
          </div>
          <p className="text-sm text-gray-600">{messages.perucris.panel.subtitulo}</p>
        </div>
        <Badge variant="info">
          {messages.perucris.panel.fuente}: {messages.perucris.panel.fuenteValor}
        </Badge>
      </header>

      {state.fase === "ok" && state.validation ? (
        <ResumenValidation validation={state.validation} />
      ) : null}

      {importResult ? <ResumenImportacion result={importResult} /> : null}

      {isLoading ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" aria-live="polite">
          <SkeletonBlock className="h-4 w-4 rounded-full" />
          <span className="text-sm text-gray-700">
            {state.fase === "pushing"
              ? messages.perucris.push.enviando
              : state.fase === "validating"
                ? messages.perucris.validar.validando
                : messages.perucris.importar.ejecutando}
          </span>
        </div>
      ) : null}

      {state.fase === "error" ? (
        <div
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <AppIcon icon={AlertCircle} size={16} className="text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{state.message}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            void onEnviar();
          }}
          disabled={!canExport || isLoading}
          aria-busy={isLoading}
        >
          <span className="button-with-icon">
            <AppIcon icon={Send} size={16} />
            <span>{messages.perucris.push.boton}</span>
          </span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void onValidar();
          }}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          <span className="button-with-icon">
            <AppIcon icon={RefreshCw} size={16} />
            <span>{messages.perucris.validar.boton}</span>
          </span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setConfirmarImportOpen(true);
          }}
          disabled={!canExport || isLoading}
          aria-busy={isLoading}
          title={messages.perucris.importar.helpContent}
        >
          <span className="button-with-icon">
            <AppIcon icon={Download} size={16} />
            <span>{messages.perucris.importar.boton}</span>
          </span>
        </button>

        {!canExport ? (
          <p className="text-xs text-gray-500">{messages.perucris.push.deshabilitado}</p>
        ) : null}
      </div>

      {state.fase === "ok" && state.validation ? (
        <BotonDetalle
          abierto={detalleAbierto}
          onToggle={() => {
            setDetalleAbierto((x) => !x);
          }}
          total={state.validation.items.length}
        />
      ) : null}

      {state.fase === "ok" && state.validation && detalleAbierto ? (
        <DetalleTabla items={state.validation.items} />
      ) : null}

      <ConfirmDialog
        open={confirmarImportOpen}
        title={messages.perucris.importar.confirm.titulo}
        message={messages.perucris.importar.confirm.mensaje}
        confirmText={messages.perucris.importar.confirm.confirmar}
        onConfirm={() => {
          void onImportConfirmado();
        }}
        onCancel={() => {
          setConfirmarImportOpen(false);
        }}
      />
    </section>
  );
};

const ResumenValidation: React.FC<{ validation: PeruCrisValidationReport }> = ({ validation }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <KpiChip label="Encontrados" value={validation.totalEncontrados} variant="success" />
    <KpiChip label="Faltantes" value={validation.totalFaltantes} variant="warning" />
    <KpiChip label="Con diferencias" value={validation.totalConDiferencias} variant="info" />
    <KpiChip label="Tiempo" value={`${validation.tiempoTotalMs} ms`} variant="default" />
  </div>
);

const ResumenImportacion: React.FC<{ result: PeruCrisImportResult }> = ({ result }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
    <h3 className="text-sm font-semibold text-gray-900">
      {messages.perucris.importar.resumen.titulo}
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiChip
        label={`${messages.perucris.importar.resumen.proyectos} — ${messages.perucris.importar.resumen.importados}`}
        value={result.proyectos.importados}
        variant="success"
      />
      <KpiChip
        label={`${messages.perucris.importar.resumen.proyectos} — ${messages.perucris.importar.resumen.omitidosDuplicado}`}
        value={result.proyectos.omitidosDuplicado}
        variant="warning"
      />
      <KpiChip
        label={`${messages.perucris.importar.resumen.publicaciones} — ${messages.perucris.importar.resumen.importados}`}
        value={result.publicaciones.importados}
        variant="success"
      />
      <KpiChip
        label={messages.perucris.importar.resumen.autoresVinculados}
        value={result.publicaciones.autoresVinculados}
        variant="info"
      />
    </div>
    {result.publicaciones.sinAutorVinculado > 0 ? (
      <p className="text-xs text-amber-800">
        {result.publicaciones.sinAutorVinculado}{" "}
        {messages.perucris.importar.resumen.sinAutorVinculado}.
      </p>
    ) : null}
    {result.publicaciones.avisos.length > 0 ? (
      <details className="text-xs text-gray-700">
        <summary className="cursor-pointer font-medium">
          {messages.perucris.importar.resumen.avisos} ({result.publicaciones.avisos.length})
        </summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          {result.publicaciones.avisos.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </details>
    ) : null}
    {result.proyectos.errores.length + result.publicaciones.errores.length > 0 ? (
      <details className="text-xs text-red-800">
        <summary className="cursor-pointer font-medium">
          {messages.perucris.importar.resumen.errores} (
          {result.proyectos.errores.length + result.publicaciones.errores.length})
        </summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          {result.proyectos.errores.map((e, i) => (
            <li key={`p${i}`}>{e}</li>
          ))}
          {result.publicaciones.errores.map((e, i) => (
            <li key={`u${i}`}>{e}</li>
          ))}
        </ul>
      </details>
    ) : null}
  </div>
);

const KpiChip: React.FC<{
  label: string;
  value: number | string;
  variant: "default" | "success" | "warning" | "info";
}> = ({ label, value, variant }) => (
  <div className="rounded-lg border border-gray-200 p-3 bg-white">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-semibold text-gray-900 mt-1">
      <Badge variant={variant}>{value}</Badge>
    </p>
  </div>
);

const BotonDetalle: React.FC<{
  abierto: boolean;
  onToggle: () => void;
  total: number;
}> = ({ abierto, onToggle, total }) => (
  <div className="pt-3 border-t border-gray-200">
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
    >
      <AppIcon icon={abierto ? ChevronUp : ChevronDown} size={16} />
      {abierto ? messages.perucris.validar.cerrarDetalle : messages.perucris.validar.verDetalle}
      <span className="text-gray-500">({total})</span>
    </button>
  </div>
);

const DetalleTabla: React.FC<{ items: PeruCrisValidationItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return <EmptyState variant="empty" message={messages.perucris.detalle.filaVacia} />;
  }
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th label={messages.perucris.detalle.columnas.tipo} />
            <Th label={messages.perucris.detalle.columnas.idLocal} />
            <Th label={messages.perucris.detalle.columnas.encontrado} />
            <Th label={messages.perucris.detalle.columnas.uuid} />
            <Th label={messages.perucris.detalle.columnas.handle} />
            <Th label={messages.perucris.detalle.columnas.diferencias} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((it) => (
            <tr key={`${it.tipo}:${it.idLocal}`}>
              <Td>
                <Badge variant="default">{labelTipo(it.tipo)}</Badge>
              </Td>
              <Td>
                <code className="text-xs">{it.idLocal}</code>
              </Td>
              <Td>
                <EstadoBadge item={it} />
              </Td>
              <Td>
                <code className="text-xs text-gray-600">{it.peruCrisUuid ?? "-"}</code>
              </Td>
              <Td>
                <code className="text-xs text-gray-600">{it.peruCrisHandle ?? "-"}</code>
              </Td>
              <Td>
                {it.diferencias.length === 0 ? (
                  <span className="text-gray-400">-</span>
                ) : (
                  <ul className="space-y-1">
                    {it.diferencias.map((d, i) => (
                      <li key={i} className="text-xs text-amber-800">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Th: React.FC<{ label: string }> = ({ label }) => (
  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
    {label}
  </th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 align-top">{children}</td>
);

const EstadoBadge: React.FC<{ item: PeruCrisValidationItem }> = ({ item }) => {
  if (!item.encontradoEnPeruCris) {
    return <Badge variant="warning">{messages.perucris.detalle.estado.noEncontrado}</Badge>;
  }
  if (item.diferencias.length > 0) {
    return <Badge variant="info">{messages.perucris.detalle.estado.conDiferencias}</Badge>;
  }
  return <Badge variant="success">{messages.perucris.detalle.estado.encontrado}</Badge>;
};

function labelTipo(tipo: ValidationTipo): string {
  switch (tipo) {
    case "orgunit":
      return messages.perucris.detalle.contadoresPorTipo.orgunit;
    case "person":
      return messages.perucris.detalle.contadoresPorTipo.person;
    case "project":
      return messages.perucris.detalle.contadoresPorTipo.project;
    case "publication":
      return messages.perucris.detalle.contadoresPorTipo.publication;
    case "patent":
      return messages.perucris.detalle.contadoresPorTipo.patent;
    default:
      return tipo;
  }
}
