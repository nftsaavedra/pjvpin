import { useCallback, useMemo, useState } from "react";
import { useFetchGrados } from "../../configuracion/grados/hooks/useFetchGrados";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import {
  buscarInvestigadorPorDni,
  consultarDniReniec,
  crearInvestigador,
  getTauriErrorMessage,
} from "../api";
import { useRenacytValidation } from "./useRenacytValidation";

type DniValidationStatus = "idle" | "checking" | "duplicate" | "validated" | "error";

export type PerfilInvestigador = "docente" | "tesista" | "alumno_egresado";

const PERFILES: { value: PerfilInvestigador; label: string }[] = [
  { value: "docente", label: "Docente" },
  { value: "tesista", label: "Tesista" },
  { value: "alumno_egresado", label: "Alumno egresado" },
];

const formatearTextoReniec = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("es-PE")
    .split(/\s+/)
    .filter(Boolean)
    .map((segmento) => segmento.charAt(0).toLocaleUpperCase("es-PE") + segmento.slice(1))
    .join(" ");

export const useInvestigadorCreateForm = (
  refreshTrigger = 0,
  onInvestigadorCreated: () => void,
  onClose: () => void,
) => {
  const [dni, setDni] = useState("");
  const [idGrado, setIdGrado] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [perfil, setPerfil] = useState<PerfilInvestigador>("docente");
  const [isLoading, setIsLoading] = useState(false);
  const [dniValidationStatus, setDniValidationStatus] = useState<DniValidationStatus>("idle");
  const [dniValidationMessage, setDniValidationMessage] = useState<string>(
    messages.investigadores.toast.dniIdle,
  );
  const [validatedDni, setValidatedDni] = useState("");

  const { grados } = useFetchGrados(refreshTrigger);

  const clearValidatedIdentity = useCallback(() => {
    setNombres("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setValidatedDni("");
  }, []);

  const renacyt = useRenacytValidation({ onRenacytValidated: () => {} });

  const dniLimpio = dni.trim();
  const renacytQueryNormalizado = renacyt.renacytQuery.trim().toUpperCase();
  const isCheckingDni = dniValidationStatus === "checking";
  const isCheckingRenacyt =
    renacyt.renacytValidationStatus === "checking" ||
    renacyt.renacytValidationStatus === "auto-checking";
  const isAutoCheckingRenacyt = renacyt.renacytValidationStatus === "auto-checking";
  const isAutoNotFoundRenacyt = renacyt.renacytValidationStatus === "auto-not-found";
  const dniFueValidado = dniValidationStatus === "validated" && validatedDni === dniLimpio;
  const renacytFueValidado =
    renacyt.renacytValidationStatus === "validated" &&
    renacyt.validatedRenacytQuery === renacytQueryNormalizado;
  const puedeValidarDni = /^\d{8}$/.test(dniLimpio) && !isCheckingDni && !isLoading;
  const puedeValidarRenacyt =
    Boolean(renacytQueryNormalizado) && dniFueValidado && !isCheckingRenacyt && !isLoading;
  const camposBloqueados = !dniFueValidado || isLoading;
  const nombreCompletoPreview = useMemo(
    () =>
      [nombres.trim(), apellidoPaterno.trim(), apellidoMaterno.trim()].filter(Boolean).join(" "),
    [apellidoMaterno, apellidoPaterno, nombres],
  );

  const resetForm = () => {
    setDni("");
    setIdGrado("");
    setNombres("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setPerfil("docente");
    setValidatedDni("");
    setDniValidationStatus("idle");
    setDniValidationMessage(messages.investigadores.toast.dniIdle);
    renacyt.resetRenacyt();
  };

  const handleDniChange = (value: string) => {
    const nextDni = value.replace(/\D/g, "").slice(0, 8);
    setDni(nextDni);

    if (nextDni !== validatedDni) {
      clearValidatedIdentity();
      renacyt.resetRenacyt(true);
      setDniValidationStatus("idle");
      setDniValidationMessage(messages.investigadores.toast.dniIdle);
    }
  };

  const handleValidarDni = async () => {
    if (!/^\d{8}$/.test(dniLimpio)) {
      toast.warning(messages.investigadores.toast.dniInvalidoAntesValidar);
      return;
    }

    setDniValidationStatus("checking");
    setDniValidationMessage(messages.investigadores.toast.dniValidando);
    try {
      const investigadorExistente = await buscarInvestigadorPorDni(dniLimpio);
      if (investigadorExistente) {
        clearValidatedIdentity();
        renacyt.resetRenacyt(true);
        setDniValidationStatus("duplicate");
        setDniValidationMessage(
          investigadorExistente.activo === 1
            ? messages.investigadores.toast.dniDuplicadoActivo
            : messages.investigadores.toast.dniDuplicadoInactivo,
        );
        toast.warning(messages.investigadores.toast.dniDuplicadoRegistrado);
        return;
      }

      const data = await consultarDniReniec(dniLimpio);
      setNombres(formatearTextoReniec(data.firstName));
      setApellidoPaterno(formatearTextoReniec(data.firstLastName));
      setApellidoMaterno(formatearTextoReniec(data.secondLastName));
      setValidatedDni(dniLimpio);
      setDniValidationStatus("validated");
      setDniValidationMessage(messages.investigadores.toast.dniValidadoMensaje);
      toast.success(messages.investigadores.toast.dniValidadoOk);

      void renacyt.triggerAutoCheck(dniLimpio);
    } catch (error) {
      clearValidatedIdentity();
      renacyt.resetRenacyt(true);
      setDniValidationStatus("error");
      setDniValidationMessage(getTauriErrorMessage(error));
      toast.error(getTauriErrorMessage(error));
    }
  };

  const handleValidarRenacyt = async () => {
    await renacyt.validarManual(renacytQueryNormalizado, dniLimpio, dniFueValidado);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const nombresLimpio = nombres.trim();
    const apellidoPaternoLimpio = apellidoPaterno.trim();
    const apellidoMaternoLimpio = apellidoMaterno.trim();

    if (!dniLimpio || !idGrado || !nombresLimpio || !apellidoPaternoLimpio) {
      toast.warning(messages.investigadores.toast.submitCompleteTodos);
      return;
    }

    if (!dniFueValidado) {
      toast.warning(messages.investigadores.toast.submitValideDni);
      return;
    }

    if (renacytQueryNormalizado && !renacytFueValidado) {
      toast.warning(messages.investigadores.toast.submitRenacytValidar);
      return;
    }

    if (!/^\d{8}$/.test(dniLimpio)) {
      toast.warning(messages.investigadores.toast.submitDni8Digitos);
      return;
    }

    if (grados.length === 0) {
      toast.warning(messages.investigadores.toast.submitSinGrados);
      return;
    }

    setIsLoading(true);
    try {
      await crearInvestigador({
        dni: dniLimpio,
        idGrado: idGrado,
        nombres: nombresLimpio,
        apellidoPaterno: apellidoPaternoLimpio,
        apellidoMaterno: apellidoMaternoLimpio || null,
        perfil,
        renacyt:
          renacytFueValidado && renacyt.renacytData
            ? {
                codigoRegistro: renacyt.renacytData.codigoRegistro,
                idInvestigador: renacyt.renacytData.idInvestigador,
                nivel: renacyt.renacytData.nivel ?? null,
                grupo: renacyt.renacytData.grupo ?? null,
                condicion: renacyt.renacytData.condicion ?? null,
                fechaInformeCalificacion: renacyt.renacytData.fechaInformeCalificacion ?? null,
                fechaRegistro: renacyt.renacytData.fechaRegistro ?? null,
                fechaUltimaRevision: renacyt.renacytData.fechaUltimaRevision ?? null,
                orcid: renacyt.renacytData.orcid ?? null,
                scopusAuthorId: renacyt.renacytData.scopusAuthorId ?? null,
                fichaUrl: renacyt.renacytData.fichaUrl,
                formacionesAcademicasJson: renacyt.renacytData.formacionesAcademicasJson ?? null,
              }
            : null,
      });
      toast.success(messages.investigadores.toast.investigadorCreadoOk);
      resetForm();
      onInvestigadorCreated();
      onClose();
    } catch (error) {
      toast.error(
        messages.investigadores.toast.investigadorCrearError(getTauriErrorMessage(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    apellidoMaterno,
    apellidoPaterno,
    camposBloqueados,
    dni,
    dniFueValidado,
    dniValidationMessage,
    dniValidationStatus,
    grados,
    handleDniChange,
    handleRenacytChange: renacyt.handleRenacytChange,
    handleSubmit,
    handleValidarDni,
    handleValidarRenacyt,
    idGrado,
    isAutoCheckingRenacyt,
    isAutoNotFoundRenacyt,
    isCheckingDni,
    isCheckingRenacyt,
    isLoading,
    nombreCompletoPreview,
    nombres,
    perfiles: PERFILES,
    perfil,
    puedeValidarDni,
    puedeValidarRenacyt,
    renacytData: renacyt.renacytData,
    renacytQuery: renacyt.renacytQuery,
    renacytSource: renacyt.renacytSource,
    renacytValidationMessage: renacyt.renacytValidationMessage,
    renacytValidationStatus: renacyt.renacytValidationStatus,
    setApellidoMaterno,
    setApellidoPaterno,
    setIdGrado,
    setNombres,
    setPerfil,
  };
};
