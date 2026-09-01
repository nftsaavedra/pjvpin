import {
  generarCodigoAutogenerado,
  normalizarCodigoManual,
  prepararParticipantes,
  resolverCodigoParaCreate,
  validarMonedaODefault,
  validarMontoAsignado,
  validarRolOrg,
  validarRolParticipacion,
} from "./proyectos.logic";
import { ORG_ROLES_VALIDOS, ROLES_PARTICIPACION_VALIDOS } from "./vocab";

describe("proyectos.logic", () => {
  describe("prepararParticipantes", () => {
    it("deduplica preservando orden de primera aparicion", () => {
      const r = prepararParticipantes(
        ["uuid-1", "uuid-2", "uuid-1", "uuid-3", "uuid-2"],
        "uuid-2",
      );
      expect(r.ids).toEqual(["uuid-1", "uuid-2", "uuid-3"]);
      expect(r.responsable).toBe("uuid-2");
    });

    it("rechaza lista vacia aunque haya responsable", () => {
      expect(() => prepararParticipantes([], "uuid-1")).toThrow(/al menos un investigador/);
    });

    it("rechaza lista no vacia sin responsable", () => {
      expect(() => prepararParticipantes(["uuid-1"], undefined)).toThrow(
        /investigador responsable/,
      );
    });

    it("rechaza responsable que no esta en la lista", () => {
      expect(() => prepararParticipantes(["uuid-1", "uuid-2"], "uuid-3")).toThrow(
        /debe estar entre los participantes/,
      );
    });

    it("ignora vacios y whitespace en los ids", () => {
      const r = prepararParticipantes(["uuid-1", "  ", "", "uuid-2"], "uuid-1");
      expect(r.ids).toEqual(["uuid-1", "uuid-2"]);
    });

    it("con `permitirListaVacia` permite lista vacia sin responsable (caso update parcial sin investigadores)", () => {
      const r = prepararParticipantes([], undefined, { permitirListaVacia: true });
      expect(r.ids).toEqual([]);
      expect(r.responsable).toBeNull();
    });
  });

  describe("generarCodigoAutogenerado", () => {
    it("produce el formato PROJ-YYYY-XXXXXX", () => {
      const fixedRand = () => 0.5;
      const code = generarCodigoAutogenerado(2026, fixedRand);
      expect(code).toMatch(/^PROJ-2026-[0-9a-f]{6}$/);
    });

    it("es deterministico con un rand inyectado", () => {
      const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      let i = 0;
      const r = () => seq[i++ % seq.length];
      const a = generarCodigoAutogenerado(2026, r);
      const b = generarCodigoAutogenerado(2026, r);
      expect(a).toBe(b);
    });

    it("usa el year pasado, no el reloj del sistema", () => {
      const code = generarCodigoAutogenerado(1999, () => 0);
      expect(code.startsWith("PROJ-1999-")).toBe(true);
    });
  });

  describe("normalizarCodigoManual", () => {
    it("trim y devuelve el string", () => {
      expect(normalizarCodigoManual("  ABC-001  ")).toBe("ABC-001");
    });
    it("vacio o whitespace => null", () => {
      expect(normalizarCodigoManual("")).toBeNull();
      expect(normalizarCodigoManual("   ")).toBeNull();
      expect(normalizarCodigoManual(null)).toBeNull();
      expect(normalizarCodigoManual(undefined)).toBeNull();
    });
    it("rechaza longitud > 64", () => {
      expect(() => normalizarCodigoManual("a".repeat(65))).toThrow(/exceder 64/);
    });
  });

  describe("resolverCodigoParaCreate", () => {
    it("usa el manual cuando viene", () => {
      const code = resolverCodigoParaCreate("UNF-2026-001", () => new Date("2026-01-01"));
      expect(code).toBe("UNF-2026-001");
    });
    it("autogenera cuando no viene", () => {
      const code = resolverCodigoParaCreate(undefined, () => new Date("2026-09-01"), () => 0.42);
      expect(code).toMatch(/^PROJ-2026-[0-9a-f]{6}$/);
    });
    it("autogenera cuando viene vacio", () => {
      const code = resolverCodigoParaCreate("", () => new Date("2026-09-01"), () => 0);
      expect(code.startsWith("PROJ-")).toBe(true);
    });
  });

  describe("validarRolOrg / validarRolParticipacion", () => {
    it.each(ORG_ROLES_VALIDOS)("acepta rol org %s", (rol) => {
      expect(() => validarRolOrg(rol)).not.toThrow();
    });
    it("rechaza rol org desconocido", () => {
      expect(() => validarRolOrg("INVALIDO")).toThrow(/invalido/);
    });
    it.each(ROLES_PARTICIPACION_VALIDOS)("acepta rol participacion %s", (rol) => {
      expect(() => validarRolParticipacion(rol)).not.toThrow();
    });
    it("rechaza rol participacion desconocido", () => {
      expect(() => validarRolParticipacion("BECARIO")).toThrow(/invalido/);
    });
  });

  describe("validarMonedaODefault", () => {
    it("devuelve PEN por default cuando no viene", () => {
      expect(validarMonedaODefault(undefined)).toBe("PEN");
      expect(validarMonedaODefault(null)).toBe("PEN");
      expect(validarMonedaODefault("")).toBe("PEN");
      expect(validarMonedaODefault("   ")).toBe("PEN");
    });
    it("acepta ISO 4217 uppercase", () => {
      expect(validarMonedaODefault("USD")).toBe("USD");
      expect(validarMonedaODefault("EUR")).toBe("EUR");
    });
    it("normaliza lowercase a uppercase", () => {
      expect(validarMonedaODefault("pen")).toBe("PEN");
    });
    it("rechaza formato invalido", () => {
      expect(() => validarMonedaODefault("PESOS")).toThrow(/ISO 4217/);
      expect(() => validarMonedaODefault("P3N")).toThrow(/ISO 4217/);
      expect(() => validarMonedaODefault("123")).toThrow(/ISO 4217/);
    });
  });

  describe("validarMontoAsignado", () => {
    it("null/undefined => null", () => {
      expect(validarMontoAsignado(undefined)).toBeNull();
    });
    it("acepta finito >= 0", () => {
      expect(validarMontoAsignado(0)).toBe(0);
      expect(validarMontoAsignado(1234.56)).toBe(1234.56);
    });
    it("rechaza negativo", () => {
      expect(() => validarMontoAsignado(-1)).toThrow(/finito >= 0/);
    });
    it("rechaza NaN/Infinity", () => {
      expect(() => validarMontoAsignado(Number.NaN)).toThrow();
      expect(() => validarMontoAsignado(Number.POSITIVE_INFINITY)).toThrow();
    });
  });
});
