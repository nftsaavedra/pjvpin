import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonBlock, SkeletonTable } from "@/shared/ui/Skeleton";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import { eliminarOrgUnit, listarOrgUnits } from "@/shared/tauri/orgUnits";
import type { OrgUnit } from "@/shared/tauri/types";
import { OrgUnitFormModal } from "./OrgUnitFormModal";

interface OrgUnitsPanelProps {
  canManage: boolean;
  onDataModified: () => void;
  refreshTrigger?: number;
}

type UnitsMap = Record<string, OrgUnit[]>;
type LoadingMap = Record<string, boolean>;
type ErrorMap = Record<string, string | null>;

const ROOT_KEY = "root";

type FormState = { mode: "create" } | { mode: "edit"; unit: OrgUnit };

export const OrgUnitsPanel: React.FC<OrgUnitsPanelProps> = ({
  canManage,
  onDataModified,
  refreshTrigger = 0,
}) => {
  const [unitsByParent, setUnitsByParent] = useState<UnitsMap>({});
  const [loadingByParent, setLoadingByParent] = useState<LoadingMap>({ [ROOT_KEY]: true });
  const [errorByParent, setErrorByParent] = useState<ErrorMap>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [allUnits, setAllUnits] = useState<OrgUnit[]>([]);
  const [unitToDelete, setUnitToDelete] = useState<OrgUnit | null>(null);

  const recargarRaiz = useCallback(async () => {
    setLoadingByParent((prev) => ({ ...prev, [ROOT_KEY]: true }));
    setErrorByParent((prev) => ({ ...prev, [ROOT_KEY]: null }));
    try {
      const units = await listarOrgUnits(null);
      setUnitsByParent((prev) => ({ ...prev, [ROOT_KEY]: units }));
    } catch (err) {
      setErrorByParent((prev) => ({ ...prev, [ROOT_KEY]: getTauriErrorMessage(err) }));
    } finally {
      setLoadingByParent((prev) => ({ ...prev, [ROOT_KEY]: false }));
    }
  }, []);

  useEffect(() => {
    void recargarRaiz();
  }, [recargarRaiz, refreshKey, refreshTrigger]);

  const toggleExpand = (unitId: string) => {
    if (expanded.has(unitId)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(unitId);
        return next;
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(unitId));
    if (!(unitId in unitsByParent)) {
      setLoadingByParent((prev) => ({ ...prev, [unitId]: true }));
      listarOrgUnits(unitId)
        .then((units) => {
          setUnitsByParent((prev) => ({ ...prev, [unitId]: units }));
        })
        .catch((err: unknown) => {
          setErrorByParent((prev) => ({ ...prev, [unitId]: getTauriErrorMessage(err) }));
        })
        .finally(() => {
          setLoadingByParent((prev) => ({ ...prev, [unitId]: false }));
        });
    }
  };

  const loadAllUnits = useCallback(async () => {
    const all: OrgUnit[] = [];
    const visit = async (parentId: string | null) => {
      const units = await listarOrgUnits(parentId);
      all.push(...units);
      for (const unit of units) {
        await visit(unit.id_org_unit);
      }
    };
    await visit(null);
    return all;
  }, []);

  const handleOpenCreate = () => {
    setFormState({ mode: "create" });
    void loadAllUnits()
      .then((units) => {
        setAllUnits(units);
      })
      .catch(() => {
        setAllUnits([]);
      });
  };

  const handleOpenEdit = (unit: OrgUnit) => {
    setFormState({ mode: "edit", unit });
    void loadAllUnits()
      .then((units) => {
        setAllUnits(units);
      })
      .catch(() => {
        setAllUnits([]);
      });
  };

  const handleEliminar = async () => {
    if (!unitToDelete) return;
    try {
      await eliminarOrgUnit(unitToDelete.id_org_unit);
      toast.success(messages.orgUnits.success.eliminado);
      setUnitToDelete(null);
      setRefreshKey((key) => key + 1);
      onDataModified();
    } catch (err) {
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(err)));
    }
  };

  const colSpan = canManage ? 5 : 4;

  const renderRows = (units: OrgUnit[], depth: number): React.ReactNode => {
    return units.flatMap((unit) => {
      const isExpanded = expanded.has(unit.id_org_unit);
      const hasLoadedChildren = unit.id_org_unit in unitsByParent;
      const isLoadingChildren = loadingByParent[unit.id_org_unit];
      const children = unitsByParent[unit.id_org_unit];
      const childError = errorByParent[unit.id_org_unit];

      const identificador = unit.ruc ?? unit.ror_id ?? unit.isni_id ?? "-";

      const rows: React.ReactNode[] = [
        <tr key={unit.id_org_unit}>
          <td style={{ paddingLeft: `${depth * 24 + 8}px` }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                onClick={() => {
                  toggleExpand(unit.id_org_unit);
                }}
                aria-label={isExpanded ? messages.orgUnits.contraer : messages.orgUnits.expandir}
              >
                <AppIcon icon={isExpanded ? ChevronDown : ChevronRight} size={16} />
              </button>
              <span className="font-medium">{unit.nombre}</span>
            </div>
          </td>
          <td>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={unit.parent_id ? "default" : "info"}>
                {unit.parent_id ? messages.orgUnits.badgeSubunidad : messages.orgUnits.badgeMatriz}
              </Badge>
              <Badge variant={unit.es_publica ? "success" : "warning"}>
                {unit.es_publica ? messages.orgUnits.publica : messages.orgUnits.privada}
              </Badge>
            </div>
          </td>
          <td>{identificador}</td>
          <td>{unit.sector_institucional ?? "-"}</td>
          {canManage && (
            <td className="table-actions">
              <TableActionButton
                className="btn-edit"
                icon={Pencil}
                label={messages.orgUnits.editar}
                onClick={() => {
                  handleOpenEdit(unit);
                }}
              />
              <TableActionButton
                className="btn-delete"
                icon={Trash2}
                label={messages.orgUnits.eliminar}
                onClick={() => {
                  setUnitToDelete(unit);
                }}
              />
            </td>
          )}
        </tr>,
      ];

      if (isExpanded) {
        if (isLoadingChildren) {
          rows.push(
            <tr key={`${unit.id_org_unit}-loading`}>
              <td colSpan={colSpan} style={{ paddingLeft: `${depth * 24 + 24}px` }}>
                <div className="py-2">
                  <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
                </div>
              </td>
            </tr>,
          );
        } else if (childError) {
          rows.push(
            <tr key={`${unit.id_org_unit}-error`}>
              <td
                colSpan={colSpan}
                style={{ paddingLeft: `${depth * 24 + 24}px` }}
                className="text-sm text-amber-600 py-2"
              >
                {messages.orgUnits.errorSubunidades}
              </td>
            </tr>,
          );
        } else if (hasLoadedChildren && children.length > 0) {
          rows.push(renderRows(children, depth + 1));
        } else if (hasLoadedChildren) {
          rows.push(
            <tr key={`${unit.id_org_unit}-empty`}>
              <td
                colSpan={colSpan}
                style={{ paddingLeft: `${depth * 24 + 24}px` }}
                className="text-sm text-gray-500 py-2"
              >
                {messages.orgUnits.sinSubunidades}
              </td>
            </tr>,
          );
        }
      }

      return rows;
    });
  };

  const rootLoading = loadingByParent[ROOT_KEY];
  const rootError = errorByParent[ROOT_KEY];
  const rootUnits = unitsByParent[ROOT_KEY] ?? [];

  return (
    <div className="tab-panel">
      <div className="table-container">
        <div className="section-header">
          <h2>{messages.orgUnits.titulo}</h2>
          {canManage && (
            <div className="section-header-actions">
              <button type="button" className="btn-primary" onClick={handleOpenCreate}>
                <span className="button-with-icon">
                  <AppIcon icon={Plus} size={18} />
                  <span>{messages.orgUnits.nuevo}</span>
                </span>
              </button>
            </div>
          )}
        </div>
        {rootError ? (
          <EmptyState
            variant="error"
            message={messages.ui.errorCarga(messages.orgUnits.titulo)}
            actionLabel={messages.ui.reintentar}
            onAction={() => {
              void recargarRaiz();
            }}
            data-testid="org-units-error"
          />
        ) : rootLoading ? (
          <SkeletonTable columns={colSpan} rows={5} />
        ) : rootUnits.length === 0 ? (
          <EmptyState
            variant="empty"
            message={messages.orgUnits.sinDatos}
            data-testid="org-units-empty"
          />
        ) : (
          <table className="table" aria-label={messages.orgUnits.tableAriaLabel}>
            <thead>
              <tr>
                <th scope="col">{messages.orgUnits.colNombre}</th>
                <th scope="col">{messages.orgUnits.colTipo}</th>
                <th scope="col">{messages.orgUnits.colIdentificador}</th>
                <th scope="col">{messages.orgUnits.colSector}</th>
                {canManage && <th scope="col">{messages.orgUnits.colAcciones}</th>}
              </tr>
            </thead>
            <tbody>{renderRows(rootUnits, 0)}</tbody>
          </table>
        )}
      </div>

      {formState && (
        <OrgUnitFormModal
          mode={formState.mode}
          initial={formState.mode === "edit" ? formState.unit : null}
          allUnits={allUnits}
          onClose={() => {
            setFormState(null);
          }}
          onSaved={() => {
            setRefreshKey((key) => key + 1);
            onDataModified();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(unitToDelete)}
        title={messages.orgUnits.confirm.eliminar}
        message={
          unitToDelete ? messages.orgUnits.confirm.eliminarMessage(unitToDelete.nombre) : ""
        }
        confirmText={messages.configuracion.confirm.siEliminar}
        cancelText={messages.configuracion.confirm.noCancelar}
        onConfirm={() => {
          void handleEliminar();
        }}
        onCancel={() => {
          setUnitToDelete(null);
        }}
      />
    </div>
  );
};
