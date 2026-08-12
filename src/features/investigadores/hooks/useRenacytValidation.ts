import { useCallback, useState } from "react";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import {
  buscarInvestigadorPorDniConRenacyt,
  consultarRenacytInvestigador,
  getTauriErrorMessage,
  type RenacytLookupResult,
} from "../api";

export type RenacytValidationStatus =
  "idle" | "checking" | "auto-checking" | "auto-not-found" | "validated" | "error";

export type RenacytSource = "auto" | "manual" | null;

export type RenacytHandlers = {
  resetRenacyt: (keepQuery?: boolean) => void;
  triggerAutoCheck: (dniLimpio: string) => Promise<void>;
  validarManual: (codigo: string, dniLimpio: string, dniValidado: boolean) => Promise<void>;
};

type UseRenacytValidationArgs = {
  onRenacytValidated: () => void;
};

export const useRenacytValidation = ({ onRenacytValidated }: UseRenacytValidationArgs) => {
  const [renacytQuery, setRenacytQuery] = useState("");
  const [renacytValidationStatus, setRenacytValidationStatus] =
    useState<RenacytValidationStatus>("idle");
  const [renacytValidationMessage, setRenacytValidationMessage] = useState<string>(
    messages.investigadores.toast.renacytIdle,
  );
  const [renacytSource, setRenacytSource] = useState<RenacytSource>(null);
  const [validatedRenacytQuery, setValidatedRenacytQuery] = useState("");
  const [renacytData, setRenacytData] = useState<RenacytLookupResult | null>(null);

  const resetRenacyt = useCallback((keepQuery = false) => {
    if (!keepQuery) {
      setRenacytQuery("");
    }
    setRenacytValidationStatus("idle");
    setRenacytValidationMessage(messages.investigadores.toast.renacytIdle);
    setRenacytSource(null);
    setValidatedRenacytQuery("");
    setRenacytData(null);
  }, []);

  const triggerAutoCheck = useCallback(
    async (dniLimpio: string) => {
      setRenacytValidationStatus("auto-checking");
      setRenacytValidationMessage(messages.investigadores.toast.renacytBuscandoAuto);
      try {
        const lookup = await buscarInvestigadorPorDniConRenacyt(dniLimpio);
        if (lookup) {
          setRenacytData(lookup);
          setRenacytSource("auto");
          setRenacytValidationStatus("validated");
          setRenacytValidationMessage(
            lookup.nivel
              ? messages.investigadores.toast.renacytEncontradoConNivel(lookup.nivel)
              : messages.investigadores.toast.renacytEncontradoAuto,
          );
          toast.success(messages.investigadores.toast.renacytEncontradoAuto);
          onRenacytValidated();
        } else {
          setRenacytData(null);
          setRenacytSource(null);
          setRenacytValidationStatus("auto-not-found");
          setRenacytValidationMessage(messages.investigadores.toast.renacytAutoNotFound);
        }
      } catch {
        setRenacytData(null);
        setRenacytSource(null);
        setRenacytValidationStatus("auto-not-found");
        setRenacytValidationMessage(messages.investigadores.toast.renacytAutoFailed);
      }
    },
    [onRenacytValidated],
  );

  const validarManual = useCallback(
    async (codigo: string, dniLimpio: string, dniValidado: boolean) => {
      if (!dniValidado) {
        toast.warning(messages.investigadores.toast.renacytAntesDni);
        return;
      }
      if (!codigo) {
        toast.warning(messages.investigadores.toast.renacytIngreseCodigo);
        return;
      }

      setRenacytValidationStatus("checking");
      setRenacytValidationMessage(messages.investigadores.toast.renacytConsultando);

      try {
        const result = await consultarRenacytInvestigador(codigo);

        if (result.numeroDocumento && result.numeroDocumento.trim() !== dniLimpio) {
          resetRenacyt(true);
          setRenacytValidationStatus("error");
          setRenacytValidationMessage(messages.investigadores.toast.renacytNoCoincideMensaje);
          toast.warning(messages.investigadores.toast.renacytNoCoincideDni);
          return;
        }

        setRenacytData(result);
        setRenacytSource("manual");
        setValidatedRenacytQuery(codigo);
        setRenacytValidationStatus("validated");
        setRenacytValidationMessage(
          result.nivel
            ? messages.investigadores.toast.renacytValidadoConNivel(result.nivel)
            : messages.investigadores.toast.renacytValidado,
        );
        toast.success(messages.investigadores.toast.renacytValidado);
        onRenacytValidated();
      } catch (error) {
        resetRenacyt(true);
        setRenacytValidationStatus("error");
        setRenacytValidationMessage(getTauriErrorMessage(error));
        toast.error(getTauriErrorMessage(error));
      }
    },
    [onRenacytValidated, resetRenacyt],
  );

  const handleRenacytChange = (value: string) => {
    const normalized = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
    setRenacytQuery(normalized);

    if (normalized !== validatedRenacytQuery) {
      resetRenacyt(true);
      setRenacytQuery(normalized);
    }
  };

  return {
    handleRenacytChange,
    renacytData,
    renacytQuery,
    renacytSource,
    renacytValidationMessage,
    renacytValidationStatus,
    resetRenacyt,
    setRenacytData,
    setRenacytSource,
    setRenacytValidationMessage,
    setRenacytValidationStatus,
    setValidatedRenacytQuery,
    triggerAutoCheck,
    validarManual,
    validatedRenacytQuery,
  };
};
