/**
 * Tests del service de PeruCRIS (`pushCerif`). Cubre la orquestacion:
 * build CERIF → push → audit → resultado.
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
import type { AuditService } from "../audit/audit.service";
import type { JobRegistry } from "../external-http/job-registry.service";
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

    const auditService = {
      writeGenericAudit: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    const jobs = {} as JobRegistry;

    const sut = new PeruCrisService(
      perucrisClient,
      auditService,
      jobs,
      cerifService,
      {} as never, // db
    );

    return { sut, perucrisClient, cerifService, auditService };
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

  it("registra audit con datos del push", async () => {
    const { sut, auditService } = buildSut();
    await sut.pushCerif(actor);

    expect(auditService.writeGenericAudit).toHaveBeenCalledWith(
      { id_usuario: "u1", username: "admin", rol: "admin" },
      "perucris.push",
      "perucris",
      "push",
      expect.stringContaining('"httpStatus":200'),
    );
  });

  it("propaga AppError del client (config/external)", async () => {
    const { sut, perucrisClient } = buildSut();
    const { AppError } = await import("../infra/errors/app-error");
    (perucrisClient.pushCerif as jest.Mock).mockRejectedValueOnce(
      AppError.config("key invalida"),
    );

    await expect(sut.pushCerif(actor)).rejects.toThrow("key invalida");
  });
});
