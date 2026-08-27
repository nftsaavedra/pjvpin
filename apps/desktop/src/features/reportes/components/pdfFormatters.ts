export const formatTimestamp = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleDateString("es-PE", { dateStyle: "medium" }) : "-";

export const formatBool = (v: boolean | undefined | null) => (v ? "Sí" : "No");

export const formatArray = (arr?: string[] | null) => (arr?.length ? arr.join(", ") : "-");
