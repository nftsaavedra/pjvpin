import { invoke } from "./client";
import type { PublicacionCientifica } from "./types";

export const getAllPublicaciones = async (): Promise<PublicacionCientifica[]> => {
  return await invoke("get_all_publicaciones");
};
