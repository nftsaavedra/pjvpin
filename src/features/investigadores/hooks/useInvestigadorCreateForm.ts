import { useMemo, useState } from "react";
import { useFetchGrados } from "../../configuracion/grados/hooks/useFetchGrados";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import {
  buscarInvestigadorPorDni,
  buscarInvestigadorPorDniConRenacyt,
  consultarDniReniec,
  consultarRenacytInvestigador,
  crearInvestigador,
  getTauriErrorMessage,
  type RenacytLookupResult,
} from "../api";

type DniValidationStatus = "idle" | "checking" | "duplicate" | "validated" | "error";
type RenacytValidationStatus =
  "idle" | "checking" | "auto-checking" | "auto-not-found" | "validated" | "error";
type RenacytSource = "auto" | "manual" | null;

export type PerfilInvestigador = "docente" | "tesista" | "alumno_egresado";

const PERFILES: { value: PerfilInvestigador; label: string }[] = [
  { value: "docente", label: "Docente" },
  { value: "tesista", label: "Tesista" },
  { value: "alumno_egresado", label: "Alumno egresado" },
];

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
  const [renacytQuery, setRenacytQuery] = useState("");
  const [renacytValidationStatus, setRenacytValidationStatus] =
    useState<RenacytValidationStatus>("idle");
  const [renacytValidationMessage, setRenacytValidationMessage] = useState<string>(
    messages.investigadores.toast.renacytIdle,
  );
  const [renacytSource, setRenacytSource] = useState<RenacytSource>(null);
  const [validatedRenacytQuery, setValidatedRenacytQuery] = useState("");
  const [renacytData, setRenacytData] = useState<RenacytLookupResult | null>(null);

  const { grados } = useFetchGrados(refreshTrigger);

  const formatearTextoReniec = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase("es-PE")
      .split(/\s+/)
      .filter(Boolean)
      .map((segmento) => segmento.charAt(0).toLocaleUpperCase("es-PE") + segmento.slice(1))
      .join(" ");

  const dniLimpio = dni.trim();
  const renacytQueryNormalizado = renacytQuery.trim().toUpperCase();
  const isCheckingDni = dniValidationStatus === "checking";
  const isCheckingRenacyt =
    renacytValidationStatus === "checking" || renacytValidationStatus === "auto-checking";
  const isAutoCheckingRenacyt = renacytValidationStatus === "auto-checking";
  const isAutoNotFoundRenacyt = renacytValidationStatus === "auto-not-found";
  const dniFueValidado = dniValidationStatus === "validated" && validatedDni === dniLimpio;
  const renacytFueValidado =
    renacytValidationStatus === "validated" && validatedRenacytQuery === renacytQueryNormalizado;
  const puedeValidarDni = /^\d{8}$/.test(dniLimpio) && !isCheckingDni && !isLoading;
  const puedeValidarRenacyt =
    Boolean(renacytQueryNormalizado) && dniFueValidado && !isCheckingRenacyt && !isLoading;
  const camposBloqueados = !dniFueValidado || isLoading;
  const nombreCompletoPreview = useMemo(
    () =>
      [nombres.trim(), apellidoPaterno.trim(), apellidoMaterno.trim()].filter(Boolean).join(" "),
    [apellidoMaterno, apellidoPaterno, nombres],
  );

  const resetRenacyt = (keepQuery = false) => {
    if (!keepQuery) {
      setRenacytQuery("");
    }
    setRenacytValidationStatus("idle");
    setRenacytValidationMessage(messages.investigadores.toast.renacytIdle);
    setRenacytSource(null);
    setValidatedRenacytQuery("");
    setRenacytData(null);
  };

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
    resetRenacyt();
  };

  const clearValidatedIdentity = () => {
    setNombres("");
    setApellidoPaterno("");
    setApellidoMaterno("");
    setValidatedDni("");
  };

  const handleDniChange = (value: string) => {
    const nextDni = value.replace(/\D/g, "").slice(0, 8);
    setDni(nextDni);

    if (nextDni !== validatedDni) {
      clearValidatedIdentity();
      resetRenacyt(true);
      setDniValidationStatus("idle");
      setDniValidationMessage(messages.investigadores.toast.dniIdle);
    }
  };

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
        resetRenacyt(true);
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
    } catch (error) {
      clearValidatedIdentity();
      resetRenacyt(true);
      setDniValidationStatus("error");
      setDniValidationMessage(getTauriErrorMessage(error));
      toast.error(getTauriErrorMessage(error));
    }
  };

  const handleValidarRenacyt = async () => {
    if (!dniFueValidado) {
      toast.warning(messages.investigadores.toast.renacytAntesDni);
      return;
    }

    if (!renacytQueryNormalizado) {
      toast.warning(messages.investigadores.toast.renacytIngreseCodigo);
      return;
    }

    setRenacytValidationStatus("checking");
    setRenacytValidationMessage(messages.investigadores.toast.renacytConsultando);

    try {
      const result = await consultarRenacytInvestigador(renacytQueryNormalizado);

      if (result.numeroDocumento && result.numeroDocumento.trim() !== dniLimpio) {
        resetRenacyt(true);
        setRenacytValidationStatus("error");
        setRenacytValidationMessage(messages.investigadores.toast.renacytNoCoincideMensaje);
        toast.warning(messages.investigadores.toast.renacytNoCoincideDni);
        return;
      }

      setRenacytData(result);
      setRenacytSource("manual");
      setValidatedRenacytQuery(renacytQueryNormalizado);
      setRenacytValidationStatus("validated");
      setRenacytValidationMessage(
        result.nivel
          ? messages.investigadores.toast.renacytValidadoConNivel(result.nivel)
          : messages.investigadores.toast.renacytValidado,
      );
      toast.success(messages.investigadores.toast.renacytValidado);
    } catch (error) {
      resetRenacyt(true);
      setRenacytValidationStatus("error");
      setRenacytValidationMessage(getTauriErrorMessage(error));
      toast.error(getTauriErrorMessage(error));
    }
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
          renacytFueValidado && renacytData
            ? {
                codigoRegistro: renacytData.codigoRegistro,
                idInvestigador: renacytData.idInvestigador,
                nivel: renacytData.nivel ?? null,
                grupo: renacytData.grupo ?? null,
                condicion: renacytData.condicion ?? null,
                fechaInformeCalificacion: renacytData.fechaInformeCalificacion ?? null,
                fechaRegistro: renacytData.fechaRegistro ?? null,
                fechaUltimaRevision: renacytData.fechaUltimaRevision ?? null,
                orcid: renacytData.orcid ?? null,
                scopusAuthorId: renacytData.scopusAuthorId ?? null,
                fichaUrl: renacytData.fichaUrl,
                formacionesAcademicasJson: renacytData.formacionesAcademicasJson ?? null,
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
    handleRenacytChange,
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
    renacytData,
    renacytQuery,
    renacytSource,
    renacytValidationMessage,
    renacytValidationStatus,
    setApellidoMaterno,
    setApellidoPaterno,
    setIdGrado,
    setNombres,
    setPerfil,
  };
};
