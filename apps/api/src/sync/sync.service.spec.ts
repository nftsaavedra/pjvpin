/**
 * Tests del service del modulo `sync`. Cubre la orquestacion del repository
 * (orden, filtrado) y la propagacion de errores desde la logica pura.
 *
 * Mockea el `SyncRepository` con un stub (los ordenes / filtros los aplica
 * MongoDB, no el service; aqui solo validamos que el service pasa los
 * parametros correctos y propaga errores de validacion).
 */
import { AppError } from "../infra/errors/app-error";
import type { SyncReportDocument } from "./dto/sync-report.dto";
import { SyncRepository } from "./sync.repository";
import { SyncService } from "./sync.service";

describe("SyncService.listRecent", () => {
  const sampleReport = (tipo: "pure_diff" | "perucris_validacion"): SyncReportDocument => ({
    id: `sync-${tipo}-1`,
    tipo,
    ejecutado_at: 1_700_000_000_000,
    resumen: {
      total: 0,
      solo_local: 0,
      solo_pure: 0,
      diferentes: 0,
      tiempo_total_ms: 0,
    },
    items: [],
  });

  function buildSut(
    reportsByTipo: Partial<
      Record<"pure_diff" | "perucris_validacion", SyncReportDocument[]>
    > = {},
  ): { sut: SyncService; repo: jest.Mocked<SyncRepository> } {
    const repo: jest.Mocked<SyncRepository> = {
      listRecent: jest.fn(async (tipo, _limit) => {
        if (tipo == null) {
          return [
            ...(reportsByTipo.pure_diff ?? []),
            ...(reportsByTipo.perucris_validacion ?? []),
          ];
        }
        return reportsByTipo[tipo as "pure_diff" | "perucris_validacion"] ?? [];
      }),
    } as unknown as jest.Mocked<SyncRepository>;
    const sut = new SyncService(repo);
    return { sut, repo };
  }

  it("devuelve todos los reportes si tipo no llega y propaga el limit clamped", async () => {
    const pure = sampleReport("pure_diff");
    const perucris = sampleReport("perucris_validacion");
    const { sut, repo } = buildSut({
      pure_diff: [pure],
      perucris_validacion: [perucris],
    });
    const result = await sut.listRecent(undefined, 5);
    expect(result).toEqual([pure, perucris]);
    expect(repo.listRecent).toHaveBeenCalledWith(null, 5);
  });

  it("filtra por tipo 'pure_diff' cuando llega en el query", async () => {
    const pure = sampleReport("pure_diff");
    const perucris = sampleReport("perucris_validacion");
    const { sut, repo } = buildSut({
      pure_diff: [pure],
      perucris_validacion: [perucris],
    });
    const result = await sut.listRecent("pure_diff", 10);
    expect(result).toEqual([pure]);
    expect(repo.listRecent).toHaveBeenCalledWith("pure_diff", 10);
  });

  it("filtra por tipo 'perucris_validacion' cuando llega en el query", async () => {
    const pure = sampleReport("pure_diff");
    const perucris = sampleReport("perucris_validacion");
    const { sut, repo } = buildSut({
      pure_diff: [pure],
      perucris_validacion: [perucris],
    });
    const result = await sut.listRecent("perucris_validacion", 10);
    expect(result).toEqual([perucris]);
    expect(repo.listRecent).toHaveBeenCalledWith("perucris_validacion", 10);
  });

  it("aplica clamp al limit antes de pasar al repository", async () => {
    const { sut, repo } = buildSut();
    await sut.listRecent(undefined, 500);
    expect(repo.listRecent).toHaveBeenCalledWith(null, 100);
  });

  it("aplica default al limit cuando llega string no numerico", async () => {
    const { sut, repo } = buildSut();
    await sut.listRecent(undefined, "abc");
    expect(repo.listRecent).toHaveBeenCalledWith(null, 10);
  });

  it("propaga AppError.validation cuando el tipo es invalido", async () => {
    const { sut, repo } = buildSut();
    await expect(sut.listRecent("otro", 10)).rejects.toThrow(AppError);
    await expect(sut.listRecent("otro", 10)).rejects.toThrow(
      /Tipo de reporte de sincronizacion desconocido/,
    );
    expect(repo.listRecent).not.toHaveBeenCalled();
  });
});
