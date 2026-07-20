import React, { useMemo } from "react";
import { Plus, Save } from "lucide-react";
import type { InvestigadorDetalle, ProyectoDetalle, ProyectoParticipantesPayload } from "../api";
import type { CatalogosProyectos } from "../hooks/useCatalogosProyectos";
import { useProyectoFormState } from "../hooks/useProyectoFormState";
import { usePendingChange } from "../hooks/usePendingChange";
import { toast } from "@/shared/feedback/toast";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { ScreenHeader } from "@/shared/ui/ScreenHeader";
import { ScreenLayout } from "@/shared/ui/ScreenLayout";
import { InvestigadoresChecklist } from "./InvestigadoresChecklist";
import { ProyectoDiffPanel } from "./ProyectoDiffPanel";
import { ResourceTabPanel } from "./ResourceTabPanel";
import { getResponsableProyecto, parseParticipantesProyecto } from "../participantes";
import { messages } from "@/shared/feedback/messages";
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
    () => (mode === "edit" ? parseParticipantesProyecto(proyecto?.participantesJson) : []),
    [mode, proyecto?.participantesJson],
  );

  const initialSelectedIds = participantesIniciales.map((p) => p.idInvestigador);
  const initialResponsableId =
    mode === "edit"
      ? (getResponsableProyecto(participantesIniciales)?.idInvestigador ?? null)
      : null;

  const form = useProyectoFormState(
    mode === "edit"
      ? {
          titulo: proyecto?.tituloProyecto ?? "",
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
    () => new Map(participantesIniciales.map((p) => [p.idInvestigador, p])),
    [participantesIniciales],
  );

  const addedInvestigadores = useMemo(
    () =>
      form.investigadoresSeleccionados
        .filter((id) => !initialSelectedIds.includes(id))
        .map((id) => investigadores.find((d) => d.idInvestigador === id)?.nombresApellidos ?? id),
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
    () => investigadores.filter((d) => form.investigadoresSeleccionados.includes(d.idInvestigador)),
    [investigadores, form.investigadoresSeleccionados],
  );

  const responsableOptions = useMemo(
    () =>
      investigadoresSeleccionados.map((d) => ({
        value: d.idInvestigador,
        label: d.nombresApellidos,
      })),
    [investigadoresSeleccionados],
  );

  const tituloOriginal = proyecto?.tituloProyecto ?? "";
  const responsableOriginalNombre =
    mode === "edit" && initialResponsableId
      ? (participantesPorId.get(initialResponsableId)?.nombre ?? null)
      : null;
  const responsableActualNombre = form.investigadorResponsableId
    ? (investigadores.find((d) => d.idInvestigador === form.investigadorResponsableId)
        ?.nombresApellidos ??
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
        title: messages.proyectos.changeRequest.agregarInvestigador.title,
        message: messages.proyectos.changeRequest.agregarInvestigador.message(
          investigador.nombresApellidos,
          form.titulo.trim() || proyecto?.tituloProyecto || "",
        ),
        confirmText: messages.proyectos.changeRequest.agregarInvestigador.confirmText,
        onConfirm: () => {
          form.setInvestigadoresSeleccionados((current) =>
            current.includes(investigador.idInvestigador)
              ? current
              : [...current, investigador.idInvestigador],
          );
        },
      });
      return;
    }

    if (
      form.investigadorResponsableId === investigador.idInvestigador &&
      form.investigadoresSeleccionados.length > 1
    ) {
      toast.warning(messages.proyectos.validations.seleccioneOtroResponsable);
      return;
    }

    requestChange({
      title: messages.proyectos.changeRequest.quitarInvestigador.title,
      message: messages.proyectos.changeRequest.quitarInvestigador.message(
        investigador.nombresApellidos,
        form.titulo.trim() || proyecto?.tituloProyecto || "",
      ),
      confirmText: messages.proyectos.changeRequest.quitarInvestigador.confirmText,
      onConfirm: () => {
        form.setInvestigadoresSeleccionados((current) =>
          current.filter((id) => id !== investigador.idInvestigador),
        );
        form.setInvestigadorResponsableId((current) =>
          current === investigador.idInvestigador ? null : current,
        );
      },
    });
  };

  const requestResponsableChange = (investigadorId: string) => {
    if (form.investigadorResponsableId === investigadorId) return;

    const investigador = investigadores.find((item) => item.idInvestigador === investigadorId);
    if (!investigador) return;

    requestChange({
      title: messages.proyectos.changeRequest.cambiarResponsable.title,
      message: messages.proyectos.changeRequest.cambiarResponsable.message(
        investigador.nombresApellidos,
      ),
      confirmText: messages.proyectos.changeRequest.cambiarResponsable.confirmText,
      onConfirm: () => {
        form.setInvestigadorResponsableId(investigadorId);
      },
    });
  };

  const handleSubmitForm = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!form.titulo.trim()) {
      toast.warning(messages.proyectos.validations.ingreseTitulo);
      return;
    }
    if (form.investigadoresSeleccionados.length > 0 && !form.investigadorResponsableId) {
      toast.warning(messages.proyectos.validations.seleccioneResponsable);
      return;
    }

    if (mode === "create") {
      if (form.investigadoresSeleccionados.length === 0 || !form.investigadorResponsableId) {
        toast.warning(messages.proyectos.validations.seleccioneInvestigadorYResponsable);
        return;
      }
      await onCreate(
        form.titulo.trim(),
        form.investigadoresSeleccionados,
        form.investigadorResponsableId,
      );
    } else {
      if (!proyecto) return;
      await onUpdate(proyecto.idProyecto, {
        tituloProyecto: form.titulo.trim(),
        investigadoresIds: form.investigadoresSeleccionados,
        investigadorResponsableId: form.investigadorResponsableId,
      });
    }
  };

  const breadcrumbCurrent =
    mode === "create"
      ? messages.proyectos.breadcrumbNuevoProyecto
      : messages.proyectos.breadcrumbEditar(proyecto?.tituloProyecto ?? "");

  return (
    <>
      <ScreenLayout
        header={
          <ScreenHeader
            parentLabel={messages.proyectos.breadcrumb}
            currentLabel={breadcrumbCurrent}
            onBack={onBack}
            isLoading={isLoading}
            submitLabel={
              mode === "create"
                ? messages.proyectos.crearProyecto
                : messages.proyectos.guardarCambios
            }
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
            <span className="screen-section-title">
              {messages.proyectos.sectionTitles.infoBasica}
            </span>
          </div>
          <FormInput
            label="Título del Proyecto"
            value={form.titulo}
            onChange={form.setTitulo}
            placeholder="Ej: Análisis de Microalgas en Agua Dulce"
            required
          />
        </div>

        <div className="screen-section">
          <div className="screen-section-header">
            <span className="screen-section-title">
              {messages.proyectos.sectionTitles.equipoInvestigacion}
            </span>
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
            help={messages.proyectos.formHelp.responsableSelect}
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
        title={pendingChange?.title ?? messages.proyectos.changeRequest.confirmarCambioFallback}
        message={pendingChange?.message ?? ""}
        confirmText={pendingChange?.confirmText ?? messages.ui.confirmar}
        cancelText={messages.ui.cancelar}
        onConfirm={confirmChange}
        onCancel={cancelChange}
      />
    </>
  );
};
