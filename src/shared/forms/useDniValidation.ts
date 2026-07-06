import { useCallback, useMemo, useState } from "react";
import type { ReniecDniLookupResult } from "@/services/tauri/types";
import { getTauriErrorMessage } from "@/services/tauri/error";
import { toast } from "@/services/toast";

export type DniValidationStatus = "idle" | "checking" | "duplicate" | "validated" | "error";

export interface UseDniValidationOptions {
  consultar: (dni: string) => Promise<ReniecDniLookupResult>;
  chequearDuplicado?: (dni: string) => Promise<boolean>;
  onValidated?: (data: ReniecDniLookupResult) => void;
}

export interface UseDniValidationResult {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  isChecking: boolean;
  isValidated: boolean;
  status: DniValidationStatus;
  message: string;
  dniLimpio: string;
  puedeValidar: boolean;
  nombreCompletoPreview: string;
  setDni: (value: string) => void;
  setNombres: (value: string) => void;
  setApellidoPaterno: (value: string) => void;
  setApellidoMaterno: (value: string) => void;
  handleValidar: () => Promise<void>;
  reset: () => void;
  loadFromPersona: (data: {
    dni: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
  }) => void;
}

const formatReniec = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase("es-PE")
    .split(/\s+/)
    .filter(Boolean)
    .map((segmento) => segmento.charAt(0).toLocaleUpperCase("es-PE") + segmento.slice(1))
    .join(" ");

export const useDniValidation = (options: UseDniValidationOptions): UseDniValidationResult => {
  const [dni, setDniState] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [validatedDni, setValidatedDni] = useState("");
  const [status, setStatus] = useState<DniValidationStatus>("idle");
  const [message, setMessage] = useState(
    "Ingrese el DNI y valide primero para habilitar el resto del registro.",
  );
  const [isChecking, setIsChecking] = useState(false);

  const dniLimpio = dni.trim();
  const isValidated = status === "validated" && validatedDni === dniLimpio;
  const puedeValidar = /^\d{8}$/.test(dniLimpio) && !isChecking;

  const clearIdentity = useCallback(() => {
    setNombres("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setValidatedDni("");
  }, []);

  const setDni = useCallback(
    (value: string) => {
      const nextDni = value.replace(/\D/g, "").slice(0, 8);
      setDniState(nextDni);
      if (nextDni !== validatedDni) {
        clearIdentity();
        setStatus("idle");
        setMessage("Ingrese el DNI y valide primero para habilitar el resto del registro.");
      }
    },
    [validatedDni, clearIdentity],
  );

  const reset = useCallback(() => {
    setDniState("");
    clearIdentity();
    setStatus("idle");
    setMessage("Ingrese el DNI y valide primero para habilitar el resto del registro.");
  }, [clearIdentity]);

  const loadFromPersona = useCallback(
    (data: { dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string }) => {
      setDniState(data.dni);
      setNombres(data.nombres);
      setApellidoPaterno(data.apellidoPaterno);
      setApellidoMaterno(data.apellidoMaterno);
      setValidatedDni(data.dni);
      setStatus("validated");
      setMessage(
        "DNI ya vinculado a una persona existente. Datos cargados desde la base principal.",
      );
    },
    [],
  );

  const handleValidar = useCallback(async () => {
    if (!/^\d{8}$/.test(dniLimpio)) {
      toast.warning("Ingrese un DNI válido de 8 dígitos antes de validar");
      return;
    }

    setIsChecking(true);
    setStatus("checking");
    setMessage("Validando DNI contra la base principal y consultando RENIEC...");
    try {
      if (options.chequearDuplicado) {
        const duplicado = await options.chequearDuplicado(dniLimpio);
        if (duplicado) {
          clearIdentity();
          setStatus("duplicate");
          setMessage(
            "Ya existe una persona registrada con ese DNI. No se puede registrar nuevamente.",
          );
          toast.warning("El DNI ingresado ya está registrado en la base principal.");
          return;
        }
      }

      const data = await options.consultar(dniLimpio);
      setNombres(formatReniec(data.first_name));
      setApellidoPaterno(formatReniec(data.first_last_name));
      setApellidoMaterno(formatReniec(data.second_last_name));
      setValidatedDni(dniLimpio);
      setStatus("validated");
      setMessage(
        "DNI validado correctamente. Los datos fueron cargados desde RENIEC y el registro está listo para completarse.",
      );
      toast.success("DNI validado y datos RENIEC cargados correctamente.");
      options.onValidated?.(data);
    } catch (error) {
      clearIdentity();
      setStatus("error");
      setMessage(getTauriErrorMessage(error));
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsChecking(false);
    }
  }, [dniLimpio, clearIdentity, options]);

  const nombreCompletoPreview = useMemo(
    () =>
      [nombres.trim(), apellidoPaterno.trim(), apellidoMaterno.trim()].filter(Boolean).join(" "),
    [apellidoMaterno, apellidoPaterno, nombres],
  );

  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    isChecking,
    isValidated,
    status,
    message,
    dniLimpio,
    puedeValidar,
    nombreCompletoPreview,
    setDni,
    setNombres,
    setApellidoPaterno,
    setApellidoMaterno,
    handleValidar,
    reset,
    loadFromPersona,
  };
};
