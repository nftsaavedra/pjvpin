import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonBlock, SkeletonTable } from "@/shared/ui/Skeleton";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { useStableFetch } from "@/shared/hooks/useStableFetch";
import { inputClassName } from "@/shared/forms/inputClassName";
import {
  listarVocabItems,
  listarVocabulariosConcytec,
  reimportarVocabulario,
} from "@/shared/tauri/vocabularios";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import type { CatalogoItem } from "@/shared/tauri/types";

interface VocabulariosPanelProps {
  canManage: boolean;
  onDataModified: () => void;
  refreshTrigger?: number;
}

type ChildrenMap = Record<string, CatalogoItem[]>;
type LoadingMap = Record<string, boolean>;

export const VocabulariosPanel: React.FC<VocabulariosPanelProps> = ({
  canManage,
  onDataModified,
  refreshTrigger = 0,
}) => {
  const {
    data: esquemas,
    loading: loadingEsquemas,
    error: errorEsquemas,
    recargar: recargarEsquemas,
  } = useStableFetch<string[]>(
    listarVocabulariosConcytec,
    refreshTrigger,
    messages.vocabularios.errorCarga,
    [],
  );

  const [esquemaActivo, setEsquemaActivo] = useState("");
  const [itemsState, setItemsState] = useState<{ esquema: string; items: CatalogoItem[] } | null>(
    null,
  );
  const [errorItems, setErrorItems] = useState<string | null>(null);
  const [childrenByParent, setChildrenByParent] = useState<ChildrenMap>({});
  const [loadingChildren, setLoadingChildren] = useState<LoadingMap>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reimportTarget, setReimportTarget] = useState<string | null>(null);
  const [isReimporting, setIsReimporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const activeScheme = esquemaActivo || esquemas[0] || "";
  const loadingItems = !itemsState || itemsState.esquema !== activeScheme;
  const rootItems = itemsState && itemsState.esquema === activeScheme ? itemsState.items : [];

  useEffect(() => {
    if (!activeScheme) return;
    let cancelled = false;
    listarVocabItems(activeScheme)
      .then((items) => {
        if (cancelled) return;
        setItemsState({ esquema: activeScheme, items });
        setErrorItems(null);
        setChildrenByParent({});
        setExpanded(new Set());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorItems(getTauriErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [activeScheme, reloadKey, refreshTrigger]);

  const recargarItemsRaiz = () => {
    setReloadKey((key) => key + 1);
  };

  const toggleExpand = (item: CatalogoItem) => {
    const key = item.codigo_skos ?? item.codigo;
    if (expanded.has(key)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(key));
    if (!(key in childrenByParent)) {
      setLoadingChildren((prev) => ({ ...prev, [key]: true }));
      listarVocabItems(activeScheme, key)
        .then((items) => {
          setChildrenByParent((prev) => ({ ...prev, [key]: items }));
        })
        .catch(() => {
          setChildrenByParent((prev) => ({ ...prev, [key]: [] }));
        })
        .finally(() => {
          setLoadingChildren((prev) => ({ ...prev, [key]: false }));
        });
    }
  };

  const handleReimportar = async () => {
    if (!reimportTarget) return;
    setIsReimporting(true);
    try {
      await reimportarVocabulario(reimportTarget);
      toast.success(messages.vocabularios.reimportadoOK);
      setReimportTarget(null);
      recargarItemsRaiz();
      onDataModified();
    } catch (err) {
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(err)));
    } finally {
      setIsReimporting(false);
    }
  };

  const renderItemRows = (items: CatalogoItem[], depth: number): React.ReactNode => {
    return items.flatMap((item) => {
      const key = item.codigo_skos ?? item.codigo;
      const isExpanded = expanded.has(key);
      const hasLoadedChildren = key in childrenByParent;
      const isLoadingChild = loadingChildren[key];
      const children = childrenByParent[key];

      const rows: React.ReactNode[] = [
        <tr key={item.id_catalogo}>
          <td style={{ paddingLeft: `${depth * 24 + 8}px` }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                onClick={() => {
                  toggleExpand(item);
                }}
                aria-label={
                  isExpanded ? messages.vocabularios.contraer : messages.vocabularios.expandir
                }
              >
                <AppIcon icon={isExpanded ? ChevronDown : ChevronRight} size={16} />
              </button>
              <span className="font-medium">{item.nombre}</span>
            </div>
          </td>
          <td>
            {item.codigo_skos ? (
              <code className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                {item.codigo_skos}
              </code>
            ) : (
              item.codigo
            )}
          </td>
          <td>
            {item.nivel != null && (
              <Badge variant="info">{messages.vocabularios.nivel(item.nivel)}</Badge>
            )}
          </td>
          <td>
            {item.editable === 0 && (
              <Badge variant="warning">{messages.vocabularios.oficialConcytec}</Badge>
            )}
          </td>
        </tr>,
      ];

      if (isExpanded) {
        if (isLoadingChild) {
          rows.push(
            <tr key={`${item.id_catalogo}-loading`}>
              <td colSpan={4} style={{ paddingLeft: `${depth * 24 + 24}px` }}>
                <div className="py-2">
                  <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
                </div>
              </td>
            </tr>,
          );
        } else if (hasLoadedChildren && children.length > 0) {
          rows.push(renderItemRows(children, depth + 1));
        } else if (hasLoadedChildren) {
          rows.push(
            <tr key={`${item.id_catalogo}-empty`}>
              <td
                colSpan={4}
                style={{ paddingLeft: `${depth * 24 + 24}px` }}
                className="text-sm text-gray-500 py-2"
              >
                {messages.vocabularios.sinSubItems}
              </td>
            </tr>,
          );
        }
      }

      return rows;
    });
  };

  const renderBody = () => {
    if (loadingEsquemas) {
      return (
        <div className="catalogos-grid catalogos-grid-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="catalogo-summary-card" aria-hidden="true">
              <SkeletonBlock className="skeleton skeleton-line skeleton-title-md" />
              <SkeletonTable columns={3} rows={3} />
            </div>
          ))}
        </div>
      );
    }
    if (errorEsquemas) {
      return (
        <EmptyState
          variant="error"
          message={messages.ui.errorCarga(messages.vocabularios.titulo)}
          actionLabel={messages.ui.reintentar}
          onAction={() => {
            void recargarEsquemas();
          }}
          data-testid="vocabularios-error-esquemas"
        />
      );
    }
    if (esquemas.length === 0) {
      return (
        <EmptyState
          variant="empty"
          message={messages.vocabularios.sinEsquemas}
          data-testid="vocabularios-empty"
        />
      );
    }
    if (loadingItems) {
      return <SkeletonTable columns={4} rows={6} />;
    }
    if (errorItems) {
      return (
        <EmptyState
          variant="error"
          message={messages.ui.errorCarga(activeScheme)}
          actionLabel={messages.ui.reintentar}
          onAction={() => {
            recargarItemsRaiz();
          }}
          data-testid="vocabularios-error-items"
        />
      );
    }
    if (rootItems.length === 0) {
      return (
        <EmptyState
          variant="empty"
          message={messages.vocabularios.sinItems}
          data-testid="vocabularios-empty-items"
        />
      );
    }
    return (
      <div className="table-container">
        <table className="table" aria-label={messages.vocabularios.tableAriaLabel(activeScheme)}>
          <thead>
            <tr>
              <th scope="col">{messages.vocabularios.colNombre}</th>
              <th scope="col">{messages.vocabularios.colCodigo}</th>
              <th scope="col">{messages.vocabularios.colNivel}</th>
              <th scope="col">
                <span className="sr-only">{messages.vocabularios.oficialConcytec}</span>
              </th>
            </tr>
          </thead>
          <tbody>{renderItemRows(rootItems, 0)}</tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="tab-panel">
      <div className="vocabularios-header flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="vocab-esquema-select" className="form-label-text">
            {messages.vocabularios.esquemaLabel}
          </label>
          <select
            id="vocab-esquema-select"
            className={inputClassName}
            value={activeScheme}
            onChange={(e) => {
              setEsquemaActivo(e.target.value);
            }}
            disabled={loadingEsquemas || esquemas.length === 0}
            aria-label={messages.vocabularios.selectAriaLabel}
          >
            {esquemas.map((esquema) => (
              <option key={esquema} value={esquema}>
                {esquema}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setReimportTarget(activeScheme);
            }}
            disabled={!activeScheme || isReimporting}
          >
            <span className="button-with-icon">
              <AppIcon icon={RotateCcw} size={18} />
              <span>{messages.vocabularios.reimportar}</span>
            </span>
          </button>
        )}
      </div>

      {renderBody()}

      <ConfirmDialog
        open={Boolean(reimportTarget)}
        title={messages.vocabularios.reimportar}
        message={
          reimportTarget ? messages.vocabularios.confirmarReimportar(reimportTarget) : ""
        }
        confirmText={messages.configuracion.confirm.siContinuar}
        cancelText={messages.configuracion.confirm.noCancelar}
        onConfirm={() => {
          void handleReimportar();
        }}
        onCancel={() => {
          setReimportTarget(null);
        }}
      />
    </div>
  );
};
