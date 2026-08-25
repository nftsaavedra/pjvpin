import React, { useState } from "react";
import { FormModal } from "@/shared/forms/FormModal";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import { AppIcon } from "@/shared/ui/AppIcon";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import {
  getPlantillaInvestigadoresDefault,
  getTauriErrorMessage,
  importarInvestigadores,
  type ImportInvestigadoresResult,
} from "../api";
import { parseDniList } from "../utils/parseDniList";
import { UploadCloud } from "lucide-react";

interface ImportInvestigadoresModalProps {
  open: boolean;
  onClose: () => void;
  onDataModified: () => void;
}

type Estado =
  | { kind: "edicion" }
  | { kind: "submitting" }
  | { kind: "resultado"; resultado: ImportInvestigadoresResult };

export const ImportInvestigadoresModal: React.FC<ImportInvestigadoresModalProps> = ({
  open,
  onClose,
  onDataModified,
}) => {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<Estado>({ kind: "edicion" });
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);

  const reset = () => {
    setTexto("");
    setEstado({ kind: "edicion" });
    setCargandoPlantilla(false);
  };

  const handleClose = () => {
    if (estado.kind === "submitting") return;
    reset();
    onClose();
  };

  const handleCargarPlantilla = async () => {
    setCargandoPlantilla(true);
    try {
      const dnis = await getPlantillaInvestigadoresDefault();
      setTexto(dnis.join("\n"));
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setCargandoPlantilla(false);
    }
  };

  const handleSubmit = async () => {
    if (estado.kind === "submitting") return;

    const { validos } = parseDniList(texto);
    if (validos.length === 0) {
      toast.warning(messages.importacion.toast.sinDnisValidos);
      return;
    }

    setEstado({ kind: "submitting" });
    try {
      const resultado = await importarInvestigadores(validos);
      setEstado({ kind: "resultado", resultado });
      toast.success(messages.importacion.resultado.success(resultado.importados));
      onDataModified();
    } catch (error) {
      toast.error(messages.importacion.toast.importarError(getTauriErrorMessage(error)));
      setEstado({ kind: "edicion" });
    }
  };

  const handleFormSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  if (!open) return null;

  const resultado = estado.kind === "resultado" ? estado.resultado : null;
  const mostrandoResultado = resultado !== null;
  const isLoading = estado.kind === "submitting";
  const { validos, invalidos } = parseDniList(texto);
  const contador =
    texto.trim().length === 0
      ? null
      : messages.importacion.modal.contadorValidos(validos.length, invalidos.length);

  return (
    <FormModal
      open={open}
      title={
        <span className="title-with-icon form-card-title">
          <AppIcon icon={UploadCloud} size={18} />
          <span>{messages.importacion.modal.title}</span>
        </span>
      }
      description={messages.importacion.modal.description}
      onClose={handleClose}
      onSubmit={(e) => {
        if (mostrandoResultado) {
          handleClose();
        } else {
          handleFormSubmit(e);
        }
      }}
      submitText={
        mostrandoResultado
          ? messages.importacion.resultado.cerrar
          : isLoading
            ? messages.importacion.modal.submitting
            : messages.importacion.modal.submit
      }
      cancelText={mostrandoResultado ? undefined : messages.importacion.modal.cancelar}
      isLoading={isLoading}
      submitDisabled={!mostrandoResultado && validos.length === 0}
      size="lg"
    >
      {mostrandoResultado ? (
        <ImportInvestigadoresResultado resultado={resultado} />
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="form-label flex items-center gap-2">
              <span>{messages.importacion.modal.dniLabel}</span>
              <FieldHelpTooltip content={messages.importacion.modal.helpDnis} label="?" />
            </span>
            <textarea
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
              }}
              placeholder={messages.importacion.modal.dniPlaceholder}
              rows={10}
              disabled={isLoading}
              className="input-class min-h-40 font-mono text-sm"
              data-testid="import-dni-textarea"
            />
            {contador && (
              <span className="text-xs text-gray-600" data-testid="import-dni-counter">
                {contador}
              </span>
            )}
          </label>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void handleCargarPlantilla();
              }}
              disabled={isLoading || cargandoPlantilla}
              data-testid="import-cargar-plantilla"
            >
              {cargandoPlantilla
                ? messages.importacion.modal.cargandoPlantilla
                : messages.importacion.modal.cargarPlantilla(
                    validos.length > 0 ? validos.length : 55,
                  )}
            </button>
            <span className="text-xs text-gray-500">
              {validos.length === 0 ? messages.importacion.toast.sinDnisValidos : ""}
            </span>
          </div>
        </div>
      )}
    </FormModal>
  );
};

const ImportInvestigadoresResultado: React.FC<{ resultado: ImportInvestigadoresResult }> = ({
  resultado,
}) => {
  const rows: Array<{
    key: string;
    label: string;
    value: number;
    tone: "ok" | "warn" | "neutral";
  }> = [
    {
      key: "total",
      label: messages.importacion.resultado.totalEvaluados(resultado.totalEvaluados),
      value: resultado.totalEvaluados,
      tone: "neutral",
    },
    {
      key: "importados",
      label: messages.importacion.resultado.importados(resultado.importados),
      value: resultado.importados,
      tone: "ok",
    },
    {
      key: "reniec",
      label: messages.importacion.resultado.autocompletadosReniec(resultado.autocompletadosReniec),
      value: resultado.autocompletadosReniec,
      tone: "ok",
    },
    {
      key: "perucris",
      label: messages.importacion.resultado.perucrisEnlazados(resultado.perucrisEnlazados),
      value: resultado.perucrisEnlazados,
      tone: "ok",
    },
    {
      key: "pure",
      label: messages.importacion.resultado.pureEnlazados(resultado.pureEnlazados),
      value: resultado.pureEnlazados,
      tone: "ok",
    },
    {
      key: "renacyt",
      label: messages.importacion.resultado.renacytEncontrados(resultado.renacytEncontrados),
      value: resultado.renacytEncontrados,
      tone: "ok",
    },
    {
      key: "dup",
      label: messages.importacion.resultado.omitidosDuplicado(resultado.omitidosDuplicado),
      value: resultado.omitidosDuplicado,
      tone: "warn",
    },
    {
      key: "sin-reniec",
      label: messages.importacion.resultado.omitidosSinReniec(resultado.omitidosSinReniec),
      value: resultado.omitidosSinReniec,
      tone: "warn",
    },
    {
      key: "renacyt-fallos",
      label: messages.importacion.resultado.renacytFallos(resultado.renacytFallos),
      value: resultado.renacytFallos,
      tone: "warn",
    },
    {
      key: "perucris-fallos",
      label: messages.importacion.resultado.perucrisFallos(resultado.perucrisFallos),
      value: resultado.perucrisFallos,
      tone: "warn",
    },
    {
      key: "pure-fallos",
      label: messages.importacion.resultado.pureFallos(resultado.pureFallos),
      value: resultado.pureFallos,
      tone: "warn",
    },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="import-resultado">
      <h3 className="font-semibold text-gray-900">{messages.importacion.resultado.titulo}</h3>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <li
            key={row.key}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              row.tone === "ok"
                ? "border-green-200 bg-green-50"
                : row.tone === "warn"
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-gray-50"
            }`}
          >
            <span className="text-gray-800">{row.label}</span>
            <span className="font-semibold tabular-nums text-gray-900">{row.value}</span>
          </li>
        ))}
      </ul>
      {resultado.errores.length > 0 && (
        <details className="rounded-md border border-red-200 bg-red-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-red-800">
            {messages.importacion.resultado.erroresTitulo(resultado.errores.length)}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700">
            {resultado.errores.slice(0, 50).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {resultado.errores.length > 50 && (
              <li className="text-gray-500">… y {resultado.errores.length - 50} más</li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
};
