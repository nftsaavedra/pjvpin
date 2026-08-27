import { invoke } from "./client";
import type { CatalogoItem } from "./types";

export const listarVocabulariosConcytec = async (): Promise<string[]> => {
  return await invoke("listar_vocabularios_concytec");
};

export const listarVocabItems = async (
  esquema: string,
  padreCodigo?: string | null,
): Promise<CatalogoItem[]> => {
  return await invoke("listar_vocab_items", { esquema, padreCodigo: padreCodigo ?? null });
};

export const reimportarVocabulario = async (esquema: string): Promise<void> => {
  await invoke("reimportar_vocabulario", { esquema });
};
