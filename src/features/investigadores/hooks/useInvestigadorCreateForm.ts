import { useMemo, useState } from "react";
import { useFetchGrados } from "../../configuracion/grados/hooks/useFetchGrados";
import { toast } from "@/services/toast";
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
  const [dniValidationMessage, setDniValidationMessage] = useState(
    "Ingrese el DNI y presione 'Validar e identificar' para consultar RENIEC y RENACYT.",
  );
  const [validatedDni, setValidatedDni] = useState("");
  const [renacytQuery, setRenacytQuery] = useState("");
  const [renacytValidationStatus, setRenacytValidationStatus] =
    useState<RenacytValidationStatus>("idle");
  const [renacytValidationMessage, setRenacytValidationMessage] = useState(
    "RENACYT se consulta automáticamente tras validar el DNI. Puede sobrescribirlo manualmente si lo desea.",
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
    setRenacytValidationMessage(
      "RENACYT se consulta automáticamente tras validar el DNI. Puede sobrescribirlo manualmente si lo desea.",
    );
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
    setDniValidationMessage(
      "Ingrese el DNI y presione 'Validar e identificar' para consultar RENIEC y RENACYT.",
    );
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
      setDniValidationMessage(
        "Ingrese el DNI y presione 'Validar e identificar' para consultar RENIEC y RENACYT.",
      );
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
      toast.warning("Ingrese un DNI válido de 8 dígitos antes de validar");
      return;
    }

    setDniValidationStatus("checking");
    setDniValidationMessage("Validando DNI contra la base principal y consultando RENIEC...");
    try {
      const investigadorExistente = await buscarInvestigadorPorDni(dniLimpio);
      if (investigadorExistente) {
        clearValidatedIdentity();
        resetRenacyt(true);
        setDniValidationStatus("duplicate");
        setDniValidationMessage(
          investigadorExistente.activo === 1
            ? "Este investigador ya está registrado en la base principal. No puede volver a crearse."
            : "Este investigador ya existe en la base principal y actualmente está inactivo. No puede registrarse nuevamente.",
        );
        toast.warning("El DNI ingresado ya pertenece a un investigador registrado.");
        return;
      }

      // Paso 1: RENIEC para nombres/apellidos
      const data = await consultarDniReniec(dniLimpio);
      setNombres(formatearTextoReniec(data.first_name));
      setApellidoPaterno(formatearTextoReniec(data.first_last_name));
      setApellidoMaterno(formatearTextoReniec(data.second_last_name));
      setValidatedDni(dniLimpio);
      setDniValidationStatus("validated");
      setDniValidationMessage("DNI validado correctamente. Datos RENIEC cargados.");
      toast.success("DNI validado y datos RENIEC cargados correctamente.");

      // Paso 2: auto-RENACYT (sub-paso visible)
      setRenacytValidationStatus("auto-checking");
      setRenacytValidationMessage("Buscando automáticamente el código RENACYT por DNI...");
      try {
        const lookup = await buscarInvestigadorPorDniConRenacyt(dniLimpio);
        if (lookup) {
          setRenacytData(lookup);
          setRenacytSource("auto");
          setRenacytValidationStatus("validated");
          setRenacytValidationMessage(
            `RENACYT encontrado automáticamente${lookup.nivel ? `. Nivel actual: ${lookup.nivel}` : ""}.`,
          );
          toast.success("Investigador identificado en RENACYT.");
        } else {
          setRenacytData(null);
          setRenacytSource(null);
          setRenacytValidationStatus("auto-not-found");
          setRenacytValidationMessage(
            "El DNI no está registrado en RENACYT. Puede registrar al investigador sin RENACYT o ingresarlo manualmente.",
          );
        }
      } catch (renacytError) {
        // Si falla RENACYT, no bloqueamos el registro: permitimos continuar
        // con solo RENIEC. Es un fallback amable.
        setRenacytData(null);
        setRenacytSource(null);
        setRenacytValidationStatus("auto-not-found");
        setRenacytValidationMessage(
          "No se pudo consultar RENACYT automáticamente. Puede continuar sin RENACYT o ingresarlo manualmente.",
        );
        // No mostramos toast.error — la validación DNI ya fue exitosa.
        // El usuario puede decidir si quiere reintentar RENACYT manualmente.
        console.warn("Auto-RENACYT lookup failed:", renacytError);
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
      toast.warning("Primero valide el DNI antes de consultar RENACYT");
      return;
    }

    if (!renacytQueryNormalizado) {
      toast.warning("Ingrese el código RENACYT o ID del investigador antes de validar");
      return;
    }

    setRenacytValidationStatus("checking");
    setRenacytValidationMessage(
      "Consultando RENACYT y verificando coincidencia con el DNI validado...",
    );

    try {
      const result = await consultarRenacytInvestigador(renacytQueryNormalizado);

      if (result.numero_documento && result.numero_documento.trim() !== dniLimpio) {
        resetRenacyt(true);
        setRenacytValidationStatus("error");
        setRenacytValidationMessage(
          "El registro RENACYT consultado no corresponde al DNI validado del investigador.",
        );
        toast.warning("El registro RENACYT no coincide con el DNI validado.");
        return;
      }

      setRenacytData(result);
      setRenacytSource("manual");
      setValidatedRenacytQuery(renacytQueryNormalizado);
      setRenacytValidationStatus("validated");
      setRenacytValidationMessage(
        `RENACYT validado correctamente${result.nivel ? `. Nivel actual: ${result.nivel}` : ""}.`,
      );
      toast.success("Datos RENACYT validados correctamente.");
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
      toast.warning("Complete todos los campos");
      return;
    }

    if (!dniFueValidado) {
      toast.warning("Valide el DNI antes de registrar al investigador");
      return;
    }

    if (renacytQueryNormalizado && !renacytFueValidado) {
      toast.warning(
        "Si ingresa un código RENACYT o ID de investigador, debe validarlo antes de registrar",
      );
      return;
    }

    if (!/^\d{8}$/.test(dniLimpio)) {
      toast.warning("El DNI debe tener exactamente 8 dígitos numéricos");
      return;
    }

    if (grados.length === 0) {
      toast.warning(
        "No hay grados académicos registrados. Cree un grado antes de registrar investigadores.",
      );
      return;
    }

    setIsLoading(true);
    try {
      await crearInvestigador({
        dni: dniLimpio,
        id_grado: idGrado,
        nombres: nombresLimpio,
        apellido_paterno: apellidoPaternoLimpio,
        apellido_materno: apellidoMaternoLimpio || null,
        perfil,
        renacyt:
          renacytFueValidado && renacytData
            ? {
                codigo_registro: renacytData.codigo_registro,
                id_investigador: renacytData.id_investigador,
                nivel: renacytData.nivel ?? null,
                grupo: renacytData.grupo ?? null,
                condicion: renacytData.condicion ?? null,
                fecha_informe_calificacion: renacytData.fecha_informe_calificacion ?? null,
                fecha_registro: renacytData.fecha_registro ?? null,
                fecha_ultima_revision: renacytData.fecha_ultima_revision ?? null,
                orcid: renacytData.orcid ?? null,
                scopus_author_id: renacytData.scopus_author_id ?? null,
                ficha_url: renacytData.ficha_url,
                formaciones_academicas_json: renacytData.formaciones_academicas_json ?? null,
              }
            : null,
      });
      toast.success("Investigador registrado exitosamente");
      resetForm();
      onInvestigadorCreated();
      onClose();
    } catch (error) {
      toast.error("Error al registrar investigador: " + getTauriErrorMessage(error));
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
