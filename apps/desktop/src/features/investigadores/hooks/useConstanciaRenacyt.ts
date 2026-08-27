import { useCallback, useState } from "react";
import { saveDesktopFile } from "@/shared/utils/saveDesktopFile";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { descargarConstanciaRenacytInvestigador, getTauriErrorMessage } from "../api";

interface DescargarConstanciaArgs {
  idInvestigador: string;
  codigoRegistro: string;
  nombresApellidos: string;
}

const sanitizeFilename = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .substring(0, 60);

export function useConstanciaRenacyt() {
  const [isDownloadingConstancia, setIsDownloadingConstancia] = useState(false);

  const descargarConstancia = useCallback(
    async (args: DescargarConstanciaArgs) => {
      if (isDownloadingConstancia) return;
      setIsDownloadingConstancia(true);
      try {
        const bytes = await descargarConstanciaRenacytInvestigador(args.idInvestigador);
        const filename = sanitizeFilename(args.nombresApellidos) || args.codigoRegistro;
        const savedPath = await saveDesktopFile({
          suggestedName: `Constancia_RENACYT_${filename}_${args.codigoRegistro}.pdf`,
          bytes,
          filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
          mimeType: "application/pdf",
        });
        if (savedPath) {
          toast.success(messages.investigadores.constancia.success(args.codigoRegistro));
        }
      } catch (err) {
        toast.error(`${messages.investigadores.constancia.error}: ${getTauriErrorMessage(err)}`);
      } finally {
        setIsDownloadingConstancia(false);
      }
    },
    [isDownloadingConstancia],
  );

  return { isDownloadingConstancia, descargarConstancia };
}
