/**
 * Tests del mapping Pure -> vocabulario canónico (`mapPureTipo`).
 *
 * La función es pura y exportada: cubre la decisión D3 del fix pre-existente.
 * Tipos sin representación en el vocabulario canónico del modelo de
 * publicaciones deben mapear a `null` (= omitir del upsert, decisión
 * profesional: nunca fabricar tipos falsos).
 */
import { mapPureTipo } from "./pure.service";

describe("mapPureTipo (D3 — sync pure)", () => {
  describe("mapeo canónico (tabla explícita)", () => {
    it.each([
      ["Article", "articulo"],
      ["article", "articulo"],
      ["Journal Article", "articulo"],
      ["journal article", "articulo"],
      ["Book", "libro"],
      ["book", "libro"],
      ["Conference Paper", "articulo_conferencia"],
      ["conference paper", "articulo_conferencia"],
      ["Conference", "articulo_conferencia"],
      ["Proceeding", "articulo_conferencia"],
      ["Chapter", "capitulo_libro"],
      ["chapter", "capitulo_libro"],
      ["Software", "software"],
      ["software", "software"],
      ["Letter", "carta"],
      ["letter", "carta"],
      ["Review", "resena"],
      ["review", "resena"],
      ["Thesis", "tesis"],
      ["thesis", "tesis"],
    ])("'%s' → '%s'", (input, expected) => {
      expect(mapPureTipo(input)).toBe(expected);
    });
  });

  describe("tipos sin representación canónica → null (OMIT del upsert)", () => {
    it.each([
      ["Dataset", null],
      ["dataset", null],
      ["Working Paper", null],
      ["working_paper", null],
      ["working paper", null],
      ["Otros", null],
      ["random unknown type", null],
      ["", null],
    ])("'%s' → null", (input, expected) => {
      expect(mapPureTipo(input)).toBe(expected);
    });

    it("null → null", () => {
      expect(mapPureTipo(null)).toBeNull();
    });
  });

  describe("forma del mapping (Pure envía tipos en inglés; nosotros mapeamos a ES)", () => {
    it("'chapter' (inglés de Pure) → 'capitulo_libro' (ES canónico)", () => {
      // Pure no envía 'capitulo_libro' en sí; envía 'chapter' y nosotros canoneamos.
      expect(mapPureTipo("chapter")).toBe("capitulo_libro");
    });

    it("'capitulo' (sufijo suelto, NO canónico) → null (omit)", () => {
      // 'capitulo' (sin '_libro') no está en vocabulario canónico; cae al default null.
      expect(mapPureTipo("capitulo")).toBeNull();
    });

    it("'articulo' (sufijo suelto, NO canónico) → null (omit)", () => {
      expect(mapPureTipo("articulo")).toBeNull();
    });
  });
});