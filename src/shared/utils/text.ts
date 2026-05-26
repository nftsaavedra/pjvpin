export const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();
