/**
 * Tests del service de PeruCRIS (`pushCerif`). Cubre la orquestacion:
 * build CERIF → push → resultado.
 *
 * La auditoría declarativa la ejecuta `AuditInterceptor`; el servicio solo
 * expone `auditContext` para casos internos. Por eso este spec no verifica
 * el audit: esa responsabilidad es del interceptor + listener, no del service.
 */
jest.mock("@nestjs/event-emitter", () => ({
  EventEmitter2: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
  })),
  OnEvent: () => () => {},
}));

import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import type { PeruCrisClient } from "../infra/http/perucris.client";
import type { CerifService } from "../cerif/cerif.service";
import type { AuditContextService } from "../audit/audit-context.service";
import type { JobRegistry } from "../external-http/job-registry.service";
import { AppError } from "../infra/errors/app-error";
import { PeruCrisService } from "./perucris.service";

describe("PeruCrisService.pushCerif", () => {
  const actor: AuthenticatedUser = {
    id_usuario: "u1",
    username: "admin",
    rol: "admin",
  };

  function buildSut(opts: {
    pushStatus?: number;
    cerifDoc?: Record<string, unknown[]>;
  } = {}) {
    const { pushStatus = 200, cerifDoc = {
      organizaciones: [{ id: "o1" }],
      personas: [{ id: "p1" }, { id: "p2" }],
      proyectos: [{ id: "pr1" }],
      publicaciones: [{ id: "pub1" }, { id: "pub2" }, { id: "pub3" }],
      patentes: [],
    } } = opts;

    const perucrisClient = {
      pushCerif: jest.fn().mockResolvedValue(pushStatus),
    } as unknown as jest.Mocked<PeruCrisClient>;

    const cerifService = {
      buildCerifDocument: jest.fn().mockResolvedValue(cerifDoc),
    } as unknown as jest.Mocked<CerifService>;

    const auditContext = {
      run: jest.fn(),
      get: jest.fn(),
      setTargetId: jest.fn(),
      setDetails: jest.fn(),
    } as unknown as jest.Mocked<AuditContextService>;

    const jobs = {} as JobRegistry;

    const sut = new PeruCrisService(
      perucrisClient,
      auditContext,
      jobs,
      cerifService,
      {} as never, // db
    );

    return { sut, perucrisClient, cerifService };
  }

  it("devuelve PeruCrisPushResult con totales correctos", async () => {
    const { sut } = buildSut();
    const result = await sut.pushCerif(actor);

    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.totalOrganizaciones).toBe(1);
    expect(result.totalPersonas).toBe(2);
    expect(result.totalProyectos).toBe(1);
    expect(result.totalPublicaciones).toBe(3);
    expect(result.totalPatentes).toBe(0);
    expect(result.enviadoAt).toBeGreaterThan(0);
  });

  it("propaga AppError del client (config/external)", async () => {
    const { sut, perucrisClient } = buildSut();
    (perucrisClient.pushCerif as jest.Mock).mockRejectedValueOnce(
      AppError.config("key invalida"),
    );

    await expect(sut.pushCerif(actor)).rejects.toThrow("key invalida");
  });
});