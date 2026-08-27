import React from "react";
import { BookText, ExternalLink, FileSpreadsheet } from "lucide-react";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Badge } from "@/shared/ui/Badge";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { inputClassName } from "@/shared/forms/inputClassName";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import { messages } from "@/shared/feedback/messages";
import type { PublicacionesTabState, OrigenFilter } from "../hooks/usePublicacionesTab";

interface PublicacionesListViewProps {
  state: PublicacionesTabState;
}

const ORIGEN_OPCIONES: OrigenFilter[] = ["todos", "PURE", "MANUAL", "PERUCRIS"];

const origenLabel = (opt: OrigenFilter): string => {
  switch (opt) {
    case "todos":
      return messages.publicaciones.toolbar.filtroOrigen.todos;
    case "PURE":
      return messages.publicaciones.toolbar.filtroOrigen.pure;
    case "MANUAL":
      return messages.publicaciones.toolbar.filtroOrigen.manual;
    case "PERUCRIS":
      return messages.publicaciones.toolbar.filtroOrigen.perucris;
  }
};

const origenBadgeVariant = (origen: string | undefined): "success" | "info" | "default" => {
  if (origen === "PURE") return "success";
  if (origen === "PERUCRIS") return "info";
  return "default";
};

export const PublicacionesListView: React.FC<PublicacionesListViewProps> = ({ state }) => {
  const {
    publicaciones,
    filtradas,
    loading,
    error,
    recargar,
    search,
    setSearch,
    anioFilter,
    setAnioFilter,
    tipoFilter,
    setTipoFilter,
    origenFilter,
    setOrigenFilter,
    aniosDisponibles,
    tiposDisponibles,
  } = state;

  return (
    <div className="tab-panel module-shell publicaciones-module space-y-4">
      <section className="card p-6 space-y-4" aria-labelledby="publicaciones-titulo">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 id="publicaciones-titulo" className="text-lg font-semibold text-gray-900">
                {messages.publicaciones.panel.titulo}
              </h2>
              <FieldHelpTooltip
                label={messages.publicaciones.panel.help}
                content={messages.publicaciones.panel.helpContent}
              />
            </div>
            <p className="text-sm text-gray-600">{messages.publicaciones.panel.subtitulo}</p>
          </div>
          <Badge variant="info">
            {publicaciones.length} {messages.publicaciones.panel.titulo.toLowerCase()}
          </Badge>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="form-group md:col-span-2">
            <span className="form-label-text">{messages.publicaciones.toolbar.search.label}</span>
            <input
              type="search"
              className={inputClassName}
              placeholder={messages.publicaciones.toolbar.search.placeholder}
              aria-label={messages.publicaciones.toolbar.search.ariaLabel}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </label>
          <label className="form-group">
            <span className="form-label-text">
              {messages.publicaciones.toolbar.filtroAnio.label}
            </span>
            <select
              className={inputClassName}
              value={anioFilter}
              onChange={(e) => {
                setAnioFilter(e.target.value);
              }}
            >
              <option value="todos">{messages.publicaciones.toolbar.filtroAnio.todos}</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={String(a)}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label-text">
              {messages.publicaciones.toolbar.filtroTipo.label}
            </span>
            <select
              className={inputClassName}
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value);
              }}
            >
              <option value="todos">{messages.publicaciones.toolbar.filtroTipo.todos}</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span className="form-label-text">
            {messages.publicaciones.toolbar.filtroOrigen.label}:
          </span>
          {ORIGEN_OPCIONES.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="origen"
                value={opt}
                checked={origenFilter === opt}
                onChange={() => {
                  setOrigenFilter(opt);
                }}
              />
              <span>{origenLabel(opt)}</span>
            </label>
          ))}
        </div>
      </section>

      {error ? (
        <div className="card p-6" role="alert">
          <p className="text-sm text-red-700">{getTauriErrorMessage(error)}</p>
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable columns={6} rows={5} />
      ) : filtradas.length === 0 ? (
        publicaciones.length === 0 ? (
          <EmptyState
            variant="empty"
            message={messages.publicaciones.empty.titulo}
            icon={BookText}
          />
        ) : (
          <EmptyState variant="filtered" message={messages.publicaciones.table.sinItems} />
        )
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>{messages.publicaciones.table.titulo}</Th>
                <Th>{messages.publicaciones.table.tipo}</Th>
                <Th>{messages.publicaciones.table.anio}</Th>
                <Th>{messages.publicaciones.table.doi}</Th>
                <Th>{messages.publicaciones.table.origen}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtradas.map((p) => (
                <tr key={p.id_publicacion}>
                  <Td>{p.titulo}</Td>
                  <Td>
                    <Badge variant="default">{p.tipo}</Badge>
                  </Td>
                  <Td className="tabular-nums">{p.anio ?? "-"}</Td>
                  <Td>
                    {p.doi ? (
                      <a
                        href={`https://doi.org/${p.doi}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                      >
                        <code className="text-xs">{p.doi}</code>
                        <AppIcon icon={ExternalLink} size={12} />
                      </a>
                    ) : (
                      <span className="text-gray-400">{messages.publicaciones.detalle.sinDoi}</span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={origenBadgeVariant(p.dominio_origen)}>
                      {p.dominio_origen ?? "MANUAL"}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error || loading ? null : (
        <button
          type="button"
          className="btn-secondary self-start"
          onClick={() => {
            recargar().catch(() => {
              /* error ya capturado por useStableFetch */
            });
          }}
          aria-label={messages.publicaciones.table.cargando}
        >
          <span className="button-with-icon">
            <AppIcon icon={FileSpreadsheet} size={14} />
            <span>{messages.publicaciones.table.cargando}</span>
          </span>
        </button>
      )}
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <td className={`px-3 py-2 align-top${className ? ` ${className}` : ""}`}>{children}</td>;
