import { AppError } from "../infra/errors/app-error";
import {
  RecursosRbacActor,
  RecursosRbacDeps,
  requireRecursosManageOrResponsable,
  requireRecursosManageOrResponsableForPatente,
  validarFechasFinanciamiento,
  validarFinanciamientoNoSelfParent,
  validarMonedaODefault,
  validarMontoFinito,
  validarOrdenPivot,
  validarPatenteTipo,
  validarTitularHolderExactlyOne,
} from "./recursos.logic";

describe("recursos.logic", () => {
  // ============================================================
  // Helper RBAC: requireRecursosManageOrResponsable
  // ============================================================
  describe("requireRecursosManageOrResponsable", () => {
    function makeDeps(opts: {
      esResp?: boolean;
      investigadorId?: string | null;
    } = {}): RecursosRbacDeps & { calls: { responsable: Array<[string, string]>; resolver: RecursosRbacActor[] } } {
      const calls = { responsable: [] as Array<[string, string]>, resolver: [] as RecursosRbacActor[] };
      return {
        calls,
        async esResponsableDelProyecto(idInv, idProy) {
          calls.responsable.push([idInv, idProy]);
          return opts.esResp ?? false;
        },
        async resolverInvestigadorIdDelActor(actor) {
          calls.resolver.push(actor);
          return opts.investigadorId ?? null;
        },
      };
    }

    it("operador con RecursosManage pasa sin tocar deps", async () => {
      const deps = makeDeps();
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "operador" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
      expect(deps.calls.responsable).toHaveLength(0);
      expect(deps.calls.resolver).toHaveLength(0);
    });

    it("admin con RecursosManage pasa sin tocar deps", async () => {
      const deps = makeDeps();
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "admin" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
      expect(deps.calls.responsable).toHaveLength(0);
    });

    it("superuser con RecursosManage pasa sin tocar deps", async () => {
      const deps = makeDeps();
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "superuser" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
      expect(deps.calls.responsable).toHaveLength(0);
    });

    it("responsable_proyecto con proyectoId + es_responsable=true → OK", async () => {
      const deps = makeDeps({ esResp: true, investigadorId: "inv-1" });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
      expect(deps.calls.resolver).toHaveLength(1);
      expect(deps.calls.responsable).toEqual([["inv-1", "p-1"]]);
    });

    it("D2: responsable_proyecto SIN proyectoId → 403 (bypass CERRADO)", async () => {
      const deps = makeDeps({ esResp: true, investigadorId: "inv-1" });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          null,
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
      // No se llega a llamar al resolver
      expect(deps.calls.resolver).toHaveLength(0);
    });

    it("D2: responsable_proyecto con proyectoId vacio → 403", async () => {
      const deps = makeDeps({ esResp: true });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          "   ",
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("D2: responsable_proyecto sin proyectoId aunque sea responsable de OTRO proyecto → 403", async () => {
      const deps = makeDeps({ esResp: true, investigadorId: "inv-1" });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          undefined,
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("responsable_proyecto con proyectoId pero NO es responsable → 403", async () => {
      const deps = makeDeps({ esResp: false, investigadorId: "inv-1" });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          "p-1",
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("responsable_proyecto sin investigador asociado → 403", async () => {
      const deps = makeDeps({ investigadorId: null });
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          "p-1",
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("rol consulta sin RecursosManage → 403", async () => {
      const deps = makeDeps();
      await expect(
        requireRecursosManageOrResponsable(
          { id_usuario: "u1", rol: "consulta" },
          "p-1",
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("requireRecursosManageOrResponsableForPatente", () => {
    function makeDeps(opts: { esResp?: boolean; investigadorId?: string | null } = {}): RecursosRbacDeps {
      return {
        async esResponsableDelProyecto() {
          return opts.esResp ?? false;
        },
        async resolverInvestigadorIdDelActor() {
          return opts.investigadorId ?? null;
        },
      };
    }

    it("operador con RecursosManage pasa", async () => {
      const deps = makeDeps();
      await expect(
        requireRecursosManageOrResponsableForPatente(
          { id_usuario: "u1", rol: "operador" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
    });

    it("D2: responsable_proyecto sobre patente sin proyectoId → 403", async () => {
      const deps = makeDeps({ esResp: true });
      await expect(
        requireRecursosManageOrResponsableForPatente(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          null,
          deps,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("responsable_proyecto sobre patente con proyectoId + es_responsable=true → OK", async () => {
      const deps = makeDeps({ esResp: true, investigadorId: "inv-1" });
      await expect(
        requireRecursosManageOrResponsableForPatente(
          { id_usuario: "u1", rol: "responsable_proyecto" },
          "p-1",
          deps,
        ),
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // Validaciones puras
  // ============================================================
  describe("validarPatenteTipo", () => {
    it.each(["invencion", "modelo_utilidad", "diseno_industrial"])("acepta %s", (t) => {
      expect(validarPatenteTipo(t)).toBe(t);
    });
    it("null/undefined/vacio → null", () => {
      expect(validarPatenteTipo(null)).toBeNull();
      expect(validarPatenteTipo(undefined)).toBeNull();
      expect(validarPatenteTipo("")).toBeNull();
      expect(validarPatenteTipo("   ")).toBeNull();
    });
    it("rechaza tipo desconocido", () => {
      expect(() => validarPatenteTipo("marca")).toThrow(/invalido/);
    });
  });

  describe("validarTitularHolderExactlyOne", () => {
    it("ORG_UNIT + idOrgUnit → OK", () => {
      expect(() =>
        validarTitularHolderExactlyOne("ORG_UNIT", "org-1", undefined),
      ).not.toThrow();
    });
    it("PERSON + idPersona → OK", () => {
      expect(() =>
        validarTitularHolderExactlyOne("PERSON", undefined, "per-1"),
      ).not.toThrow();
    });
    it("holder_type ORG_UNIT sin id_org_unit → throw (exactly-one falla antes)", () => {
      expect(() =>
        validarTitularHolderExactlyOne("ORG_UNIT", undefined, undefined),
      ).toThrow(/exactamente un identificador/);
    });
    it("holder_type PERSON con id_org_unit (mismatch) → throw", () => {
      expect(() =>
        validarTitularHolderExactlyOne("PERSON", "org-1", undefined),
      ).toThrow(/id_persona/);
    });
    it("ambos ids presentes → throw (exactly-one)", () => {
      expect(() =>
        validarTitularHolderExactlyOne("ORG_UNIT", "org-1", "per-1"),
      ).toThrow(/no ambos/);
    });
    it("holder_type invalido → throw", () => {
      expect(() =>
        validarTitularHolderExactlyOne("COMPANY", "org-1", undefined),
      ).toThrow(/Holder type invalido/);
    });
  });

  describe("validarOrdenPivot", () => {
    it("acepta enteros >= 1", () => {
      expect(validarOrdenPivot(1)).toBe(1);
      expect(validarOrdenPivot(5)).toBe(5);
    });
    it("rechaza 0 / negativos / null / NaN", () => {
      expect(() => validarOrdenPivot(0)).toThrow();
      expect(() => validarOrdenPivot(-1)).toThrow();
      expect(() => validarOrdenPivot(null)).toThrow();
      expect(() => validarOrdenPivot(undefined)).toThrow();
      expect(() => validarOrdenPivot(1.5)).toThrow();
    });
  });

  describe("validarMonedaODefault", () => {
    it("devuelve PEN por default", () => {
      expect(validarMonedaODefault(undefined)).toBe("PEN");
      expect(validarMonedaODefault(null)).toBe("PEN");
      expect(validarMonedaODefault("")).toBe("PEN");
    });
    it("acepta ISO 4217 uppercase y normaliza lowercase", () => {
      expect(validarMonedaODefault("USD")).toBe("USD");
      expect(validarMonedaODefault("eur")).toBe("EUR");
    });
    it("rechaza formato invalido", () => {
      expect(() => validarMonedaODefault("PESOS")).toThrow(/ISO 4217/);
      expect(() => validarMonedaODefault("123")).toThrow(/ISO 4217/);
    });
  });

  describe("validarMontoFinito", () => {
    it("null/undefined → null", () => {
      expect(validarMontoFinito(null)).toBeNull();
      expect(validarMontoFinito(undefined)).toBeNull();
    });
    it("acepta finito >= 0", () => {
      expect(validarMontoFinito(0)).toBe(0);
      expect(validarMontoFinito(123.45)).toBe(123.45);
    });
    it("rechaza negativo / NaN / Infinity", () => {
      expect(() => validarMontoFinito(-1)).toThrow();
      expect(() => validarMontoFinito(Number.NaN)).toThrow();
      expect(() => validarMontoFinito(Number.POSITIVE_INFINITY)).toThrow();
    });
  });

  describe("validarFechasFinanciamiento", () => {
    it("OK si ambas ausentes", () => {
      expect(() => validarFechasFinanciamiento(null, null)).not.toThrow();
    });
    it("OK si fechaFin >= fechaInicio", () => {
      expect(() => validarFechasFinanciamiento(100, 200)).not.toThrow();
      expect(() => validarFechasFinanciamiento(100, 100)).not.toThrow();
    });
    it("rechaza fechaFin < fechaInicio", () => {
      expect(() => validarFechasFinanciamiento(200, 100)).toThrow(/>= fecha de inicio/);
    });
    it("tolerante si solo una viene", () => {
      expect(() => validarFechasFinanciamiento(100, null)).not.toThrow();
      expect(() => validarFechasFinanciamiento(null, 200)).not.toThrow();
    });
  });

  describe("validarFinanciamientoNoSelfParent", () => {
    it("null parent → OK", () => {
      expect(() => validarFinanciamientoNoSelfParent("f-1", null)).not.toThrow();
      expect(() => validarFinanciamientoNoSelfParent("f-1", undefined)).not.toThrow();
    });
    it("parent != self → OK", () => {
      expect(() => validarFinanciamientoNoSelfParent("f-1", "f-2")).not.toThrow();
    });
    it("parent == self → throw", () => {
      expect(() => validarFinanciamientoNoSelfParent("f-1", "f-1")).toThrow(/su propio padre/);
    });
    it("create con id null + parent valido → OK", () => {
      expect(() => validarFinanciamientoNoSelfParent(null, "f-1")).not.toThrow();
    });
  });
});
