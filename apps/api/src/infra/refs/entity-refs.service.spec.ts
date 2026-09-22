import { AppError } from "../errors/app-error";
import { EntityRefsService } from "./entity-refs.service";

describe("EntityRefsService", () => {
  const buildService = (responses: Array<unknown>): {
    service: EntityRefsService;
    findOneQueries: Array<{ collection: string; query: unknown }>;
  } => {
    const findOneQueries: Array<{ collection: string; query: unknown }> = [];
    const collection = {
      findOne: jest.fn(async (query: unknown) => {
        const last = findOneQueries[findOneQueries.length - 1];
        if (last) last.query = query;
        return responses.shift() ?? null;
      }),
    };
    const db = {
      collection: jest.fn((name: string) => {
        findOneQueries.push({ collection: name, query: undefined });
        return collection;
      }),
    } as unknown as ConstructorParameters<typeof EntityRefsService>[0];
    return {
      service: new EntityRefsService(db),
      findOneQueries,
    };
  };

  it("exists(): resuelve true cuando findOne retorna un documento", async () => {
    const { service, findOneQueries } = buildService([{ id_proyecto: "p-1" }]);
    await expect(service.exists("proyectos", "p-1")).resolves.toBe(true);
    expect(findOneQueries[0].collection).toBe("proyectos");
    expect(findOneQueries[0].query).toEqual({
      $or: expect.arrayContaining([{ id_proyecto: "p-1" }, { id_org_unit: "p-1" }]),
    });
  });

  it("exists(): resuelve false cuando findOne retorna null", async () => {
    const { service } = buildService([null]);
    await expect(service.exists("proyectos", "missing")).resolves.toBe(false);
  });

  it("assertExists(): lanza AppError.notFound con la etiqueta proporcionada", async () => {
    const { service } = buildService([null]);
    await expect(
      service.assertExists("financiamientos", "f-1", "Financiamiento"),
    ).rejects.toBeInstanceOf(AppError);
    try {
      await service.assertExists("financiamientos", "f-1", "Financiamiento");
    } catch (err) {
      expect((err as AppError).variant).toBe("NotFound");
      expect((err as Error).message).toBe("Financiamiento no encontrado.");
    }
  });

  it("assertExists(): resuelve cuando la entidad existe", async () => {
    const { service } = buildService([{ id_financiamiento: "f-1" }]);
    await expect(
      service.assertExists("financiamientos", "f-1", "Financiamiento"),
    ).resolves.toBeUndefined();
  });
});
