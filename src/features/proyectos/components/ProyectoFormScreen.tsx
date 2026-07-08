import React, { useMemo } from "react";
import { Plus, Save } from "lucide-react";
import type { InvestigadorDetalle, ProyectoDetalle, ProyectoParticipantesPayload } from "../api";
import type { CatalogosProyectos } from "../hooks/useCatalogosProyectos";
import { useProyectoFormState } from "../hooks/useProyectoFormState";
import { usePendingChange } from "../hooks/usePendingChange";
import { toast } from "@/services/toast";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { InvestigadoresChecklist } from "./InvestigadoresChecklist";
import { ProyectoDiffPanel } from "./ProyectoDiffPanel";
import { ResourceTabPanel } from "./ResourceTabPanel";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import type { RelatedEntity } from "./relatedEntity";

interface ProyectoFormScreenProps {
  mode: "create" | "edit";
  proyecto?: ProyectoDetalle | null;
  investigadores: InvestigadorDetalle[];
  loadingInvestigadores: boolean;
  refreshingInvestigadores: boolean;
  catalogos: CatalogosProyectos;
  patentes: RelatedEntity[];
  productos: RelatedEntity[];
  equipamientos: RelatedEntity[];
  financiamientos: RelatedEntity[];
  isLoading: boolean;
  onBack: () => void;
  onCreate: (titulo: string, investigadoresIds: string[], responsableId: string) => Promise<void>;
  onUpdate: (id: string, payload: ProyectoParticipantesPayload) => Promise<void>;
  onPatentesChange: (items: RelatedEntity[]) => void;
  onProductosChange: (items: RelatedEntity[]) => void;
  onEquipamientosChange: (items: RelatedEntity[]) => void;
  onFinanciamientosChange: (items: RelatedEntity[]) => void;
}

export const ProyectoFormScreen: React.FC<ProyectoFormScreenProps> = ({
  mode,
  proyecto,
  investigadores,
  loadingInvestigadores,
  refreshingInvestigadores,
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

  const initialSelectedIds = participantesIniciales.map((p) => p.id_investigador);
  const initialResponsableId =
    mode === "edit"
      ? (getResponsableProyecto(participantesIniciales)?.id_investigador ?? null)
      : null;

  const form = useProyectoFormState(
    mode === "edit"
      ? {
          titulo: proyecto?.titulo_proyecto ?? "",
          investigadoresSeleccionados: initialSelectedIds,
          investigadorResponsableId: initialResponsableId,
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
    () => new Map(participantesIniciales.map((p) => [p.id_investigador, p])),
    [participantesIniciales],
  );

  const addedInvestigadores = useMemo(
    () =>
      form.investigadoresSeleccionados
        .filter((id) => !initialSelectedIds.includes(id))
        .map((id) => investigadores.find((d) => d.id_investigador === id)?.nombres_apellidos ?? id),
    [investigadores, initialSelectedIds, form.investigadoresSeleccionados],
  );

  const removedInvestigadores = useMemo(
    () =>
      initialSelectedIds
        .filter((id) => !form.investigadoresSeleccionados.includes(id))
        .map((id) => participantesPorId.get(id)?.nombre ?? id),
    [initialSelectedIds, participantesPorId, form.investigadoresSeleccionados],
  );

  const investigadoresSeleccionados = useMemo(
    () => investigadores.filter((d) => form.investigadoresSeleccionados.includes(d.id_investigador)),
    [investigadores, form.investigadoresSeleccionados],
  );

  const responsableOptions = useMemo(
    () =>
      investigadoresSeleccionados.map((d) => ({
        value: d.id_investigador,
        label: d.nombres_apellidos,
      })),
    [investigadoresSeleccionados],
  );

  const tituloOriginal = proyecto?.titulo_proyecto ?? "";
  const responsableOriginalNombre =
    mode === "edit" && initialResponsableId
      ? (participantesPorId.get(initialResponsableId)?.nombre ?? null)
      : null;
  const responsableActualNombre = form.investigadorResponsableId
    ? (investigadores.find((d) => d.id_investigador === form.investigadorResponsableId)
        ?.nombres_apellidos ??
      participantesPorId.get(form.investigadorResponsableId)?.nombre ??
      null)
    : null;

  const hasDiff =
    mode === "edit" &&
    (form.titulo.trim() !== tituloOriginal.trim() ||
      addedInvestigadores.length > 0 ||
      removedInvestigadores.length > 0 ||
      form.investigadorResponsableId !== initialResponsableId);

  const requestToggleInvestigador = (investigador: InvestigadorDetalle, nextSelected: boolean) => {
    if (nextSelected) {
      requestChange({
        title: "Agregar investigador al proyecto",
        message: `Se agregará a ${investigador.nombres_apellidos} al proyecto "${form.titulo.trim() || proyecto?.titulo_proyecto || ""}".`,
        confirmText: "Sí, agregar",
        onConfirm: () => {
          form.setInvestigadoresSeleccionados((current) =>
            current.includes(investigador.id_investigador)
              ? current
              : [...current, investigador.id_investigador],
          );
        },
      });
      return;
    }

    if (
      form.investigadorResponsableId === investigador.id_investigador &&
      form.investigadoresSeleccionados.length > 1
    ) {
      toast.warning(
        "Seleccione otro investigador responsable antes de quitar al responsable actual.",
      );
      return;
    }

    requestChange({
      title: "Quitar investigador del proyecto",
      message: `Se quitará a ${investigador.nombres_apellidos} del proyecto "${form.titulo.trim() || proyecto?.titulo_proyecto || ""}".`,
      confirmText: "Sí, quitar",
      onConfirm: () => {
        form.setInvestigadoresSeleccionados((current) =>
          current.filter((id) => id !== investigador.id_investigador),
        );
        form.setInvestigadorResponsableId((current) =>
          current === investigador.id_investigador ? null : current,
        );
      },
    });
  };

  const requestResponsableChange = (investigadorId: string) => {
    if (form.investigadorResponsableId === investigadorId) return;

    const investigador = investigadores.find((item) => item.id_investigador === investigadorId);
    if (!investigador) return;

    requestChange({
      title: "Cambiar investigador responsable",
      message: `Se asignará a ${investigador.nombres_apellidos} como investigador responsable del proyecto.`,
      confirmText: "Sí, asignar responsable",
      onConfirm: () => {
        form.setInvestigadorResponsableId(investigadorId);
      },
    });
  };

  const handleSubmitForm = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!form.titulo.trim()) {
      toast.warning("Ingrese el título del proyecto");
      return;
    }
    if (form.investigadoresSeleccionados.length > 0 && !form.investigadorResponsableId) {
      toast.warning("Seleccione un investigador responsable antes de guardar los cambios.");
      return;
    }

    if (mode === "create") {
      if (form.investigadoresSeleccionados.length === 0 || !form.investigadorResponsableId) {
        toast.warning("Seleccione al menos un investigador y un responsable");
        return;
      }
      await onCreate(
        form.titulo.trim(),
        form.investigadoresSeleccionados,
        form.investigadorResponsableId,
      );
    } else {
      if (!proyecto) return;
      await onUpdate(proyecto.id_proyecto, {
        titulo_proyecto: form.titulo.trim(),
        investigadores_ids: form.investigadoresSeleccionados,
        investigador_responsable_id: form.investigadorResponsableId,
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
            help="Registre el nombre con el que el proyecto será identificado en listados, reportes y relaciones con investigadores."
            required
          />
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">Equipo de investigación</span>
          </div>
          <FormSelect
            label="Investigador responsable"
            value={form.investigadorResponsableId ?? ""}
            onChange={requestResponsableChange}
            options={responsableOptions}
            placeholder={
              form.investigadoresSeleccionados.length === 0
                ? "Primero agregue investigadores al proyecto"
                : "-- Seleccionar responsable --"
            }
            disabled={form.investigadoresSeleccionados.length === 0}
            help="Solo puede elegir como responsable a un investigador ya vinculado a este proyecto."
          />
          <InvestigadoresChecklist
            investigadores={investigadores}
            selectedIds={form.investigadoresSeleccionados}
            onChange={form.setInvestigadoresSeleccionados}
            onToggleInvestigador={mode === "edit" ? requestToggleInvestigador : undefined}
            responsableId={form.investigadorResponsableId}
            loading={loadingInvestigadores}
            refreshing={refreshingInvestigadores}
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
            addedInvestigadores={addedInvestigadores}
            removedInvestigadores={removedInvestigadores}
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
