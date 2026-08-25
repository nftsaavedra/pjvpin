import React from "react";
import { type LucideIcon } from "lucide-react";
import { AppIcon } from "./AppIcon";

interface ScreenFormFooterProps {
  submitLabel: string;
  submitIcon: LucideIcon;
  onSubmit: () => void;
  cancelLabel: string;
  onCancel: () => void;
  isLoading?: boolean;
  submitDisabled?: boolean;
  /** Texto de ayuda visible cuando el submit esta deshabilitado (Nielsen #1). */
  disabledHint?: string;
  /**
   * Tipo del boton submit. Por defecto `"button"` cuando no hay `formId`
   * (el footer dispara `onSubmit` directo). Si se pasa `formId`, el boton
   * se fuerza a `type="submit"` automaticamente (el atributo HTML `form`
   * solo tiene efecto con `type="submit"`); este prop se ignora en ese
   * caso. No se omite el prop por compatibilidad con callers explicitos.
   */
  submitType?: "submit" | "button";
  /**
   * Si se especifica, el submit se asocia a un `<form id={formId}>` via
   * el atributo HTML `form`, lo que permite reenviar el submit desde
   * fuera del `<form>` (util cuando el footer vive fuera del children
   * de ScreenLayout). En este caso `onSubmit` se omite para evitar
   * doble dispacho (el submit del browser ya invoca el onSubmit del form).
   * Implica `type="submit"` en el boton.
   */
  formId?: string;
}

/**
 * Pie de acciones para pantallas con formulario completo (no modal).
 * Patron en espejo al `StepFooter` del wizard: cancelar a la izquierda,
 * submit a la derecha, helper text visible cuando el submit esta
 * deshabilitado.
 */
export const ScreenFormFooter: React.FC<ScreenFormFooterProps> = ({
  submitLabel,
  submitIcon: SubmitIcon,
  onSubmit,
  cancelLabel,
  onCancel,
  isLoading = false,
  submitDisabled = false,
  disabledHint,
  submitType = "button",
  formId,
}) => (
  <div className="flex items-center justify-end gap-3 px-6 py-4">
    {disabledHint && (submitDisabled || isLoading) && (
      <span className="mr-auto text-xs text-gray-500" aria-live="polite">
        {disabledHint}
      </span>
    )}
    <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
      {cancelLabel}
    </button>
    <button
      type={formId ? "submit" : submitType}
      form={formId}
      className="btn-primary"
      onClick={formId ? undefined : onSubmit}
      disabled={submitDisabled || isLoading}
      aria-busy={isLoading}
    >
      <span className="button-with-icon">
        <AppIcon icon={SubmitIcon} size={18} className={isLoading ? "animate-spin" : ""} />
        <span>{submitLabel}</span>
      </span>
    </button>
  </div>
);
