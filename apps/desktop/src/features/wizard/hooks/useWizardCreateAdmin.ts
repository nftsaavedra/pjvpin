import { useState } from "react";
import { useDniValidation } from "@/shared/forms/useDniValidation";
import { bootstrap, bootstrapReniecDni } from "@/features/auth/api";
import { toast } from "@/shared/feedback/toast";
import type { Usuario } from "@/shared/api/types";

interface UseWizardCreateAdminOptions {
  reniecDisponible: boolean;
  onCreated: (usuario: Usuario) => void;
}

export const useWizardCreateAdmin = (options: UseWizardCreateAdminOptions) => {
  const { reniecDisponible, onCreated } = options;

  const dni = useDniValidation({
    consultar: (numero) => bootstrapReniecDni(numero),
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManualMode = !reniecDisponible;
  const identidadCompleta =
    dni.isValidated ||
    (isManualMode &&
      dni.dniLimpio.length === 8 &&
      dni.nombres.trim().length > 0 &&
      dni.apellidoPaterno.trim().length > 0);
  const canSubmit =
    identidadCompleta &&
    username.trim().length > 0 &&
    password.trim().length >= 8 &&
    password === confirmPassword &&
    !isSubmitting;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!/^\d{8}$/.test(dni.dniLimpio)) {
      toast.error("El DNI debe tener exactamente 8 dígitos numéricos.");
      return;
    }
    if (isManualMode) {
      if (!dni.nombres.trim() || !dni.apellidoPaterno.trim()) {
        toast.error("Ingrese nombres y apellido paterno para continuar sin RENIEC.");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const usuario = await bootstrap({
        username,
        password,
        dni: dni.dniLimpio,
        nombres: dni.nombres,
        apellidoPaterno: dni.apellidoPaterno,
        apellidoMaterno: dni.apellidoMaterno,
      });
      toast.success("Usuario superuser creado correctamente");
      onCreated(usuario);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    dni,
    isManualMode,
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    canSubmit,
    handleSubmit,
  };
};
