import React, { useMemo } from "react";
import { Plus, Save } from "lucide-react";
import type { DocenteDetalle, ProyectoDetalle, ProyectoParticipantesPayload } from "../api";
import type { CatalogosProyectos } from "../hooks/useCatalogosProyectos";
import { useProyectoFormState } from "../hooks/useProyectoFormState";
import { usePendingChange } from "../hooks/usePendingChange";
import { toast } from "@/services/toast";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { DocentesChecklist } from "./DocentesChecklist";
import { ProyectoDiffPanel } from "./ProyectoDiffPanel";
import { ResourceTabPanel } from "./ResourceTabPanel";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import type { RelatedEntity } from "./relatedEntity";

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

  const { pendingChange, requestChange, confirmChange, cancelChange } = usePendingChange();

  const { reset: resetForm } = form;

  React.useEffect(() => {
    if (mode === "create") {
      resetForm();
    }
  }, [mode, resetForm]);

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
      requestChange({
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

    requestChange({
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

    requestChange({
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

  return (
    <>
      <ScreenLayout
        header={
          <ScreenHeader
            parentLabel="Proyectos"
            currentLabel={breadcrumbCurrent}
            onBack={onBack}
            isLoading={isLoading}
            submitLabel={mode === "create" ? "Crear Proyecto" : "Guardar cambios"}
            submitIcon={mode === "create" ? Plus : Save}
            onSubmit={() =>
              void handleSubmitForm({ preventDefault: () => {} } as React.SyntheticEvent)
            }
            submitDisabled={!form.isValid}
          />
        }
      >
        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">Información básica</span>
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
            <span className="screen-section-title">Equipo de investigación</span>
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
          <ProyectoDiffPanel
            hasDiff={hasDiff}
            tituloOriginal={tituloOriginal}
            tituloActual={form.titulo}
            responsableOriginalNombre={responsableOriginalNombre}
            responsableActualNombre={responsableActualNombre}
            addedDocentes={addedDocentes}
            removedDocentes={removedDocentes}
          />
        )}

        <ResourceTabPanel
          catalogos={catalogos}
          patentes={patentes}
          productos={productos}
          equipamientos={equipamientos}
          financiamientos={financiamientos}
          onPatentesChange={onPatentesChange}
          onProductosChange={onProductosChange}
          onEquipamientosChange={onEquipamientosChange}
          onFinanciamientosChange={onFinanciamientosChange}
        />
      </ScreenLayout>

      <ConfirmDialog
        open={Boolean(pendingChange)}
        title={pendingChange?.title ?? "Confirmar cambio"}
        message={pendingChange?.message ?? ""}
        confirmText={pendingChange?.confirmText ?? "Confirmar"}
        cancelText="Cancelar"
        onConfirm={confirmChange}
        onCancel={cancelChange}
      />
    </>
  );
};
