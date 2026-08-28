import * as fs from "node:fs";
import * as path from "node:path";

let cached: string[] | null = null;

/**
 * Carga los DNIs por defecto del archivo `seed_investigadores_default.json`
 * (alineado con `apps/desktop/src-tauri/src/investigadores/data/seed_investigadores_default.json`,
 * fuente original UNF v0.1.0). Si el archivo no existe (p.ej. en tests
 * sin el bundle), cae a un placeholder vacio. Cache en memoria tras la
 * primera lectura.
 */
export function loadPlantillaDefault(): string[] {
  if (cached !== null) return cached;
  const filename = path.join(__dirname, "data", "seed_investigadores_default.json");
  try {
    const raw = fs.readFileSync(filename, "utf-8");
    const parsed = JSON.parse(raw) as { entries?: Array<{ dni?: string }> };
    const dnis = (parsed.entries ?? [])
      .map((e) => (typeof e?.dni === "string" ? e.dni.trim() : ""))
      .filter((d) => /^\d{8}$/.test(d));
    if (dnis.length === 0) {
      cached = [];
      return cached;
    }
    cached = dnis;
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}
