import { apiFetch } from "../http/client";
import type { CatalogoItem } from "./types";

export const listarVocabulariosConcytec = async (): Promise<string[]> => {
  return apiFetch("/vocabularios");
};

export const listarVocabItems = async (
  esquema: string,
  padre_codigo?: string | null,
): Promise<CatalogoItem[]> => {
  return apiFetch(`/vocabularios/${encodeURIComponent(esquema)}/items`, {
    query: padre_codigo ? { padre_codigo } : undefined,
  });
};

export const reimportarVocabulario = async (esquema: string): Promise<void> => {
  await apiFetch(`/vocabularios/${encodeURIComponent(esquema)}/reimportar`, {
    method: "POST",
  });
};
