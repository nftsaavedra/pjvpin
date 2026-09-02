import { apiFetch } from "../http/client";
import type { PublicacionCientifica } from "./types";

export const getAllPublicaciones = async (): Promise<PublicacionCientifica[]> => {
  return apiFetch("/publicaciones");
};
