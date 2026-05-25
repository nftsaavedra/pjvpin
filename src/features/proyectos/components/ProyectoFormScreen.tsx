import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Beaker,
  DollarSign,
  FolderOpen,
  Lightbulb,
  Package,
  Plus,
  Save,
} from "lucide-react";
import type { DocenteDetalle, ProyectoDetalle, ProyectoParticipantesPayload } from "../api";
import type { CatalogosProyectos } from "../hooks/useCatalogosProyectos";
import { useProyectoFormState } from "../hooks/useProyectoFormState";
import { toast } from "@/services/toast";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";
import { DocentesChecklist } from "./DocentesChecklist";
import { RelatedEntitiesSection } from "./RelatedEntitiesSection";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import type { RelatedEntity } from "./relatedEntity";

interface PendingProyectoChange {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

interface ProyectoFormScreenProps {
  mode: "create" | "edit";
  proyecto?: ProyectoDetalle | null;
  docentes: DocenteDetalle[];
  loadingDocentes: boolean;
  refreshingDocentes: boolean;
  catalogos: CatalogosProyectos;
  patentes: RelatedEntity[];
  productos: RelatedEntity[];
  equipamientos: RelatedEntity[];
  financiamientos: RelatedEntity[];
  isLoading: boolean;
  onBack: () => void;
  onCreate: (titulo: string, docentesIds: string[], responsableId: string) => Promise<void>;
  onUpdate: (id: string, payload: ProyectoParticipantesPayload) => Promise<void>;
  onPatentesChange: (items: RelatedEntity[]) => void;
  onProductosChange: (items: RelatedEntity[]) => void;
  onEquipamientosChange: (items: RelatedEntity[]) => void;
  onFinanciamientosChange: (items: RelatedEntity[]) => void;
}

type ResourceTab = "patentes" | "productos" | "equipamiento" | "financiamiento";

export const ProyectoFormScreen: React.FC<ProyectoFormScreenProps> = ({
  mode,
  proyecto,
  docentes,
  loadingDocentes,
  refreshingDocentes,
  catalogos,
  patentes,
  productos,
  equipamientos,
  financiamientos,
  isLoading,
  onBack,
  onCreate,
  onUpdate,
  onPatentesChange,
  onProductosChange,
  onEquipamientosChange,
  onFinanciamientosChange,
}) => {
  const participantesIniciales = useMemo(
    () => (mode === "edit" ? parseParticipantesProyecto(proyecto?.participantes_json) : []),
    [mode, proyecto?.participantes_json],
  );

  const initialSelectedIds = participantesIniciales.map((p) => p.id_docente);
  const initialResponsableId =
    mode === "edit" ? (getResponsableProyecto(participantesIniciales)?.id_docente ?? null) : null;

  const form = useProyectoFormState(
    mode === "edit"
      ? {
          titulo: proyecto?.titulo_proyecto ?? "",
          docentesSeleccionados: initialSelectedIds,
          docenteResponsableId: initialResponsableId,
        }
      : {},
  );

  const [pendingChange, setPendingChange] = useState<PendingProyectoChange | null>(null);
  const [activeResourceTab, setActiveResourceTab] = useState<ResourceTab>("patentes");

  React.useEffect(() => {
    if (mode === "create") {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const participantesPorId = useMemo(
    () => new Map(participantesIniciales.map((p) => [p.id_docente, p])),
    [participantesIniciales],
  );

  const addedDocentes = useMemo(
    () =>
      form.docentesSeleccionados
        .filter((id) => !initialSelectedIds.includes(id))
        .map((id) => docentes.find((d) => d.id_docente === id)?.nombres_apellidos ?? id),
    [docentes, initialSelectedIds, form.docentesSeleccionados],
  );

  const removedDocentes = useMemo(
    () =>
      initialSelectedIds
        .filter((id) => !form.docentesSeleccionados.includes(id))
        .map((id) => participantesPorId.get(id)?.nombre ?? id),
    [initialSelectedIds, participantesPorId, form.docentesSeleccionados],
  );

  const docentesSeleccionados = useMemo(
    () => docentes.filter((d) => form.docentesSeleccionados.includes(d.id_docente)),
    [docentes, form.docentesSeleccionados],
  );

  const responsableOptions = useMemo(
    () =>
      docentesSeleccionados.map((d) => ({
        value: d.id_docente,
        label: d.nombres_apellidos,
      })),
    [docentesSeleccionados],
  );

  const tituloOriginal = proyecto?.titulo_proyecto ?? "";
  const responsableOriginalNombre =
    mode === "edit" && initialResponsableId
      ? (participantesPorId.get(initialResponsableId)?.nombre ?? null)
      : null;
  const responsableActualNombre = form.docenteResponsableId
    ? (docentes.find((d) => d.id_docente === form.docenteResponsableId)?.nombres_apellidos ??
      participantesPorId.get(form.docenteResponsableId)?.nombre ??
      null)
    : null;

  const hasDiff =
    mode === "edit" &&
    (form.titulo.trim() !== tituloOriginal.trim() ||
      addedDocentes.length > 0 ||
      removedDocentes.length > 0 ||
      form.docenteResponsableId !== initialResponsableId);

  const requestToggleDocente = (docente: DocenteDetalle, nextSelected: boolean) => {
    if (nextSelected) {
      setPendingChange({
        title: "Agregar docente al proyecto",
        message: `Se agregará a ${docente.nombres_apellidos} al proyecto "${form.titulo.trim() || proyecto?.titulo_proyecto || ""}".`,
        confirmText: "Sí, agregar",
        onConfirm: () => {
          form.setDocentesSeleccionados((current) =>
            current.includes(docente.id_docente) ? current : [...current, docente.id_docente],
          );
        },
      });
      return;
    }

    if (form.docenteResponsableId === docente.id_docente && form.docentesSeleccionados.length > 1) {
      toast.warning("Seleccione otro docente responsable antes de quitar al responsable actual.");
      return;
    }

    setPendingChange({
      title: "Quitar docente del proyecto",
      message: `Se quitará a ${docente.nombres_apellidos} del proyecto "${form.titulo.trim() || proyecto?.titulo_proyecto || ""}".`,
      confirmText: "Sí, quitar",
      onConfirm: () => {
        form.setDocentesSeleccionados((current) =>
          current.filter((id) => id !== docente.id_docente),
        );
        form.setDocenteResponsableId((current) =>
          current === docente.id_docente ? null : current,
        );
      },
    });
  };

  const requestResponsableChange = (docenteId: string) => {
    if (form.docenteResponsableId === docenteId) return;

    const docente = docentes.find((item) => item.id_docente === docenteId);
    if (!docente) return;

    setPendingChange({
      title: "Cambiar docente responsable",
      message: `Se asignará a ${docente.nombres_apellidos} como docente responsable del proyecto.`,
      confirmText: "Sí, asignar responsable",
      onConfirm: () => {
        form.setDocenteResponsableId(docenteId);
      },
    });
  };

  const handleSubmitForm = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!form.titulo.trim()) {
      toast.warning("Ingrese el título del proyecto");
      return;
    }
    if (form.docentesSeleccionados.length > 0 && !form.docenteResponsableId) {
      toast.warning("Seleccione un docente responsable antes de guardar los cambios.");
      return;
    }

    if (mode === "create") {
      if (form.docentesSeleccionados.length === 0 || !form.docenteResponsableId) {
        toast.warning("Seleccione al menos un docente y un responsable");
        return;
      }
      await onCreate(form.titulo.trim(), form.docentesSeleccionados, form.docenteResponsableId);
    } else {
      if (!proyecto) return;
      await onUpdate(proyecto.id_proyecto, {
        titulo_proyecto: form.titulo.trim(),
        docentes_ids: form.docentesSeleccionados,
        docente_responsable_id: form.docenteResponsableId,
      });
    }
  };

  const breadcrumbCurrent =
    mode === "create" ? "Registrar nuevo proyecto" : `Editar: ${proyecto?.titulo_proyecto ?? ""}`;

  const resourceTabs: { id: ResourceTab; label: string; icon: typeof FolderOpen }[] = [
    { id: "patentes", label: "Patentes", icon: Beaker },
    { id: "productos", label: "Productos I+D+i", icon: Lightbulb },
    { id: "equipamiento", label: "Equipamiento", icon: Package },
    { id: "financiamiento", label: "Financiamiento", icon: DollarSign },
  ];

  return (
    <>
      <div className="screen-layout">
        <div className="screen-header">
          <div className="screen-header-left">
            <div className="screen-breadcrumb">
              <button
                type="button"
                className="screen-breadcrumb-back"
                onClick={onBack}
                aria-label="Volver a proyectos"
              >
                <AppIcon icon={ArrowLeft} size={14} />
              </button>
              <span>Proyectos</span>
              <span className="screen-breadcrumb-sep">/</span>
              <span className="screen-breadcrumb-current">{breadcrumbCurrent}</span>
            </div>
          </div>
          <div className="screen-header-right">
            <button type="button" className="btn-secondary" onClick={onBack} disabled={isLoading}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={(e) => {
                void handleSubmitForm(e);
              }}
              disabled={!form.isValid || isLoading}
            >
              <span className="button-with-icon">
                <AppIcon icon={mode === "create" ? Plus : Save} size={18} />
                <span>{mode === "create" ? "Crear Proyecto" : "Guardar cambios"}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="screen-body">
          <div className="screen-section">
            <div className="screen-section-header">
              <span className="screen-section-title">
                <AppIcon icon={FolderOpen} size={18} />
                <span>Información básica</span>
              </span>
            </div>
            <FormInput
              label="Título del Proyecto"
              value={form.titulo}
              onChange={form.setTitulo}
              placeholder="Ej: Análisis de Microalgas en Agua Dulce"
              help="Registre el nombre con el que el proyecto será identificado en listados, reportes y relaciones con docentes."
              required
            />
          </div>

          <div className="screen-section">
            <div className="screen-section-header">
              <span className="screen-section-title">
                <AppIcon icon={FolderOpen} size={18} />
                <span>Equipo de investigación</span>
              </span>
            </div>
            <FormSelect
              label="Docente responsable"
              value={form.docenteResponsableId ?? ""}
              onChange={requestResponsableChange}
              options={responsableOptions}
              placeholder={
                form.docentesSeleccionados.length === 0
                  ? "Primero agregue docentes al proyecto"
                  : "-- Seleccionar responsable --"
              }
              disabled={form.docentesSeleccionados.length === 0}
              help="Solo puede elegir como responsable a un docente ya vinculado a este proyecto."
            />
            <DocentesChecklist
              docentes={docentes}
              selectedIds={form.docentesSeleccionados}
              onChange={form.setDocentesSeleccionados}
              onToggleDocente={mode === "edit" ? requestToggleDocente : undefined}
              responsableId={form.docenteResponsableId}
              loading={loadingDocentes}
              refreshing={refreshingDocentes}
              showSelectedMeta={false}
              showRequiredError={mode === "create"}
            />
          </div>

          {mode === "edit" && (
            <div className="screen-section" aria-label="Resumen visual de cambios pendientes">
              <div className="project-diff-header">
                <strong>Cambios pendientes</strong>
                <span className={`badge ${hasDiff ? "badge-info" : "badge-success"}`}>
                  {hasDiff ? "Con cambios" : "Sin cambios"}
                </span>
              </div>
              {!hasDiff ? (
                <p className="project-diff-empty">
                  Todavía no hay diferencias respecto al proyecto actual.
                </p>
              ) : (
                <div className="project-diff-list">
                  {form.titulo.trim() !== tituloOriginal.trim() && (
                    <article className="project-diff-row">
                      <span className="project-diff-label">Título</span>
                      <div className="project-diff-values">
                        <span className="project-diff-old">{tituloOriginal || "Sin título"}</span>
                        <span className="project-diff-arrow">{"\u2192"}</span>
                        <span className="project-diff-new">
                          {form.titulo.trim() || "Sin título"}
                        </span>
                      </div>
                    </article>
                  )}
                  {form.docenteResponsableId !== initialResponsableId && (
                    <article className="project-diff-row">
                      <span className="project-diff-label">Responsable</span>
                      <div className="project-diff-values">
                        <span className="project-diff-old">
                          {responsableOriginalNombre ?? "Sin responsable"}
                        </span>
                        <span className="project-diff-arrow">{"\u2192"}</span>
                        <span className="project-diff-new">
                          {responsableActualNombre ?? "Sin responsable"}
                        </span>
                      </div>
                    </article>
                  )}
                  {addedDocentes.length > 0 && (
                    <article className="project-diff-row">
                      <span className="project-diff-label">Agregados</span>
                      <div className="project-diff-chip-row">
                        {addedDocentes.map((nombre) => (
                          <span key={`add-${nombre}`} className="project-diff-chip is-added">
                            {nombre}
                          </span>
                        ))}
                      </div>
                    </article>
                  )}
                  {removedDocentes.length > 0 && (
                    <article className="project-diff-row">
                      <span className="project-diff-label">Retirados</span>
                      <div className="project-diff-chip-row">
                        {removedDocentes.map((nombre) => (
                          <span key={`remove-${nombre}`} className="project-diff-chip is-removed">
                            {nombre}
                          </span>
                        ))}
                      </div>
                    </article>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="screen-section">
            <div className="screen-section-header">
              <span className="screen-section-title">Entidades relacionadas</span>
            </div>
            <p className="screen-section-description">
              Agregue patentes, productos, equipamiento y financiamiento asociados al proyecto.
            </p>

            <div className="screen-tabs">
              {resourceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`screen-tab-button ${activeResourceTab === tab.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveResourceTab(tab.id);
                  }}
                >
                  <AppIcon icon={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {activeResourceTab === "patentes" && (
              <RelatedEntitiesSection
                title="Patentes"
                icon={<AppIcon icon={Beaker} size={18} />}
                description="Agregue patentes asociadas con este proyecto (opcional)."
                items={patentes}
                fields={[
                  {
                    name: "numero_patente",
                    label: "Número de Patente",
                    placeholder: "Ej: PE-2024-00123",
                    required: true,
                  },
                  {
                    name: "titulo_patente",
                    label: "Título",
                    placeholder: "Ej: Proceso de purificación de agua",
                    required: true,
                  },
                  {
                    name: "estado",
                    label: "Estado",
                    type: "select",
                    options: catalogos.estadoPatente,
                    required: false,
                  },
                ]}
                onItemsChange={onPatentesChange}
              />
            )}

            {activeResourceTab === "productos" && (
              <RelatedEntitiesSection
                title="Productos I+D+i"
                icon={<AppIcon icon={Lightbulb} size={18} />}
                description="Agregue productos innovadores del proyecto (opcional)."
                items={productos}
                fields={[
                  {
                    name: "nombre_producto",
                    label: "Nombre del Producto",
                    placeholder: "Ej: Sistema de tratamiento",
                    required: true,
                  },
                  {
                    name: "descripcion",
                    label: "Descripción",
                    placeholder: "Breve descripción del producto",
                    type: "textarea",
                    required: false,
                  },
                  {
                    name: "etapa",
                    label: "Etapa de Desarrollo",
                    type: "select",
                    options: catalogos.etapaProducto,
                    required: false,
                  },
                ]}
                onItemsChange={onProductosChange}
              />
            )}

            {activeResourceTab === "equipamiento" && (
              <RelatedEntitiesSection
                title="Equipamiento"
                icon={<AppIcon icon={Package} size={18} />}
                description="Agregue equipamiento adquirido o desarrollado (opcional)."
                items={equipamientos}
                fields={[
                  {
                    name: "nombre_equipo",
                    label: "Nombre del Equipo",
                    placeholder: "Ej: Cromatógrafo de gases",
                    required: true,
                  },
                  {
                    name: "especificaciones",
                    label: "Especificaciones",
                    placeholder: "Detalles técnicos",
                    type: "textarea",
                    required: false,
                  },
                  {
                    name: "costo",
                    label: "Costo Estimado (S/)",
                    type: "number",
                    placeholder: "0.00",
                    required: false,
                  },
                ]}
                onItemsChange={onEquipamientosChange}
              />
            )}

            {activeResourceTab === "financiamiento" && (
              <RelatedEntitiesSection
                title="Financiamiento"
                icon={<AppIcon icon={DollarSign} size={18} />}
                description="Agregue fuentes de financiamiento del proyecto (opcional)."
                items={financiamientos}
                fields={[
                  {
                    name: "fuente",
                    label: "Tipo de Financiamiento",
                    type: "select",
                    options: catalogos.tipoFinanciamiento,
                    required: true,
                  },
                  {
                    name: "monto",
                    label: "Monto (S/)",
                    type: "number",
                    placeholder: "0.00",
                    required: false,
                  },
                  {
                    name: "estado_financiero",
                    label: "Estado",
                    type: "select",
                    options: catalogos.estadoFinanciero,
                    required: false,
                  },
                ]}
                onItemsChange={onFinanciamientosChange}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingChange)}
        title={pendingChange?.title ?? "Confirmar cambio"}
        message={pendingChange?.message ?? ""}
        confirmText={pendingChange?.confirmText ?? "Confirmar"}
        cancelText="Cancelar"
        onConfirm={() => {
          pendingChange?.onConfirm();
          setPendingChange(null);
        }}
        onCancel={() => {
          setPendingChange(null);
        }}
      />
    </>
  );
};
