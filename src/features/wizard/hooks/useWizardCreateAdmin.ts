import { useState } from "react";
import { useDniValidation } from "@/shared/forms/useDniValidation";
import { getTauriErrorMessage, registrarPrimerUsuario } from "@/features/auth/api";
import { wizardConsultarDni } from "@/services/tauri/wizard";
import { toast } from "@/services/toast";
import type { Usuario } from "@/services/tauri/types";

interface UseWizardCreateAdminOptions {
  reniecToken: string;
  reniecDisponible: boolean;
  mongodbUri: string;
  mongodbDb?: string;
  onCreated: (usuario: Usuario) => void;
}

export const useWizardCreateAdmin = (options: UseWizardCreateAdminOptions) => {
  const { reniecToken, reniecDisponible, mongodbUri, mongodbDb, onCreated } = options;

  const dni = useDniValidation({
    consultar: (numero) => wizardConsultarDni(reniecToken, numero),
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
      const usuario = await registrarPrimerUsuario({
        username,
        password,
        dni: dni.dniLimpio,
        nombres: dni.nombres,
        apellido_paterno: dni.apellidoPaterno,
        apellido_materno: dni.apellidoMaterno,
        mongodbUri,
        mongodbDb,
      });
      toast.success("Usuario superuser creado correctamente");
      onCreated(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
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
