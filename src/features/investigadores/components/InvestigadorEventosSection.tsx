import React, { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { InlineIconButton } from "@/shared/ui/InlineIconButton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { inputClassName } from "@/shared/forms/inputClassName";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { crearEvento, eliminarEvento, getTauriErrorMessage } from "../api";
import type { EventoAcademico } from "@/shared/tauri/types";
import { useEventosInvestigador } from "../hooks/useEventosInvestigador";
import { hasPermission } from "@/shared/auth/permissions";

interface InvestigadorEventosSectionProps {
  investigadorId: string;
  currentRol: string | null;
  nombreCompleto: string;
}

const TIPO_OPTIONS = [
  { value: "Conferencia", label: "Conferencia" },
  { value: "Seminario", label: "Seminario" },
  { value: "Workshop", label: "Workshop" },
  { value: "Otro", label: "Otro" },
] as const;

const formatFecha = (timestamp: number | null | undefined): string => {
  if (timestamp == null) return "-";
  try {
    return new Date(timestamp).toLocaleDateString("es-PE");
  } catch {
    return "-";
  }
};

const isoToDateInput = (timestamp: number | undefined): string => {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

interface FormState {
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  lugar: string;
  descripcion: string;
}

const FORM_INICIAL: FormState = {
  nombre: "",
  tipo: "Conferencia",
  fechaInicio: "",
  fechaFin: "",
  lugar: "",
  descripcion: "",
};

export const InvestigadorEventosSection: React.FC<InvestigadorEventosSectionProps> = ({
  investigadorId,
  currentRol,
  nombreCompleto,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { eventos, isLoading, loaded, loadEventos, resetEventos } =
    useEventosInvestigador(investigadorId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventoAEliminar, setEventoAEliminar] = useState<EventoAcademico | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManage = hasPermission(currentRol, "investigadores.manage");

  const handleToggle = async (): Promise<void> => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      await loadEventos();
    }
  };

  const handleOpenForm = (): void => {
    setForm(FORM_INICIAL);
    setIsFormOpen(true);
  };

  const handleCloseForm = (): void => {
    setIsFormOpen(false);
    setForm(FORM_INICIAL);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.nombre.trim()) return;
    setIsSubmitting(true);
    try {
      const fechaInicioMs = form.fechaInicio ? new Date(form.fechaInicio).getTime() : undefined;
      const fechaFinMs = form.fechaFin ? new Date(form.fechaFin).getTime() : undefined;
      await crearEvento({
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        fechaInicio: fechaInicioMs,
        fechaFin: fechaFinMs,
        lugar: form.lugar.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
      });
      toast.success(messages.investigadores.eventos.successCrear);
      handleCloseForm();
      await loadEventos();
    } catch (error) {
      toast.error(
        `${messages.investigadores.eventos.errorOperacion}: ${getTauriErrorMessage(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!eventoAEliminar) return;
    try {
      await eliminarEvento(eventoAEliminar.id_evento);
      toast.success(messages.investigadores.eventos.successEliminar);
      setEventoAEliminar(null);
      await loadEventos();
    } catch (error) {
      toast.error(
        `${messages.investigadores.eventos.errorOperacion}: ${getTauriErrorMessage(error)}`,
      );
    }
  };

  return (
    <section className="renacyt-detail-card">
      <header className="renacyt-detail-header">
        <div className="renacyt-detail-title">
          <AppIcon icon={CalendarDays} size={18} />
          <h3>{messages.investigadores.eventos.titulo}</h3>
          <Badge variant="info">{eventos.length}</Badge>
        </div>
        <div className="renacyt-detail-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void handleToggle();
            }}
            aria-expanded={expanded}
          >
            <span className="button-with-icon">
              <AppIcon icon={expanded ? ChevronUp : ChevronDown} size={16} />
              <span>
                {expanded
                  ? messages.investigadores.eventos.colapsar
                  : messages.investigadores.eventos.expandir}
              </span>
            </span>
          </button>
          {expanded && loaded && canManage && (
            <button type="button" className="btn-primary" onClick={handleOpenForm}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={16} />
                <span>{messages.investigadores.eventos.agregar}</span>
              </span>
            </button>
          )}
          {expanded && loaded && (
            <InlineIconButton
              icon={RefreshCw}
              label={messages.investigadores.eventos.recargar}
              onClick={() => {
                resetEventos();
                void loadEventos();
              }}
              disabled={isLoading}
            />
          )}
        </div>
      </header>

      {expanded && (
        <div className="renacyt-detail-body">
          {isLoading ? (
            <EmptyState variant="empty" message={messages.investigadores.eventos.cargando} />
          ) : eventos.length === 0 ? (
            <EmptyState
              variant="empty"
              message={messages.investigadores.eventos.sinEventos(nombreCompleto)}
            />
          ) : (
            <ul className="space-y-3">
              {eventos.map((evento) => (
                <li key={evento.id_evento} className="card-item">
                  <div className="card-item-header">
                    <div>
                      <h4 className="card-item-title">{evento.nombre}</h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="info">{evento.tipo}</Badge>
                        <span className="text-xs text-gray-600">
                          {formatFecha(evento.fecha_inicio)}
                          {evento.fecha_fin ? ` - ${formatFecha(evento.fecha_fin)}` : ""}
                        </span>
                        {evento.lugar && (
                          <span className="text-xs text-gray-600">{evento.lugar}</span>
                        )}
                      </div>
                      {evento.descripcion && (
                        <p className="text-sm text-gray-700 mt-2">{evento.descripcion}</p>
                      )}
                    </div>
                    {canManage && (
                      <InlineIconButton
                        icon={Trash2}
                        label={messages.investigadores.eventos.eliminar}
                        onClick={() => {
                          setEventoAEliminar(evento);
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FormModal
        open={isFormOpen}
        title={messages.investigadores.eventos.modalTitle}
        onClose={handleCloseForm}
        onSubmit={(e: React.SyntheticEvent) => {
          e.preventDefault();
          void handleSubmit();
        }}
        submitText={messages.investigadores.eventos.guardar}
        isLoading={isSubmitting}
        size="md"
      >
        <FormInput
          label={messages.investigadores.eventos.nombreLabel}
          value={form.nombre}
          onChange={(v) => {
            setForm({ ...form, nombre: v });
          }}
          required
          maxLength={200}
        />
        <FormSelect
          label={messages.investigadores.eventos.tipoLabel}
          value={form.tipo}
          onChange={(v) => {
            setForm({ ...form, tipo: v });
          }}
          options={TIPO_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label-text">
              {messages.investigadores.eventos.fechaInicioLabel}
            </label>
            <input
              type="date"
              className={inputClassName}
              value={form.fechaInicio}
              onChange={(e) => {
                setForm({ ...form, fechaInicio: e.target.value });
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label-text">
              {messages.investigadores.eventos.fechaFinLabel}
            </label>
            <input
              type="date"
              className={inputClassName}
              value={form.fechaFin}
              onChange={(e) => {
                setForm({ ...form, fechaFin: e.target.value });
              }}
            />
          </div>
        </div>
        <FormInput
          label={messages.investigadores.eventos.lugarLabel}
          value={form.lugar}
          onChange={(v) => {
            setForm({ ...form, lugar: v });
          }}
          maxLength={150}
        />
        <FormInput
          label={messages.investigadores.eventos.descripcionLabel}
          value={form.descripcion}
          onChange={(v) => {
            setForm({ ...form, descripcion: v });
          }}
          maxLength={500}
        />
      </FormModal>

      <ConfirmDialog
        open={eventoAEliminar !== null}
        title={messages.investigadores.eventos.confirmarEliminarTitulo}
        message={messages.investigadores.eventos.confirmarEliminar(eventoAEliminar?.nombre ?? "")}
        confirmText={messages.investigadores.eventos.eliminarConfirmar}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          setEventoAEliminar(null);
        }}
      />
    </section>
  );
};

// Note: isoToDateInput reserved for future edit feature (Phase M.3 extension).
void isoToDateInput;
