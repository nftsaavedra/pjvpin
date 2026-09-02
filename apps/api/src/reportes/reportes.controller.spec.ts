/**
 * Tests del controller de reportes para el endpoint CERIF.
 * Cubre: entidad invalida→400, valida→200+headers.
 */
import { AppError } from "../infra/errors/app-error";
import { ReportesController } from "./reportes.controller";
import type { ReportesService } from "./reportes.service";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";

describe("ReportesController.getCerif", () => {
  const actor: AuthenticatedUser = {
    id_usuario: "u1",
    username: "admin",
    rol: "admin",
  };

  function buildSut(overrides: Partial<ReportesService> = {}) {
    const service = {
      exportarCerif: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<ReportesService>;

    const controller = new ReportesController(service);
    return { controller, service };
  }

  function mockRes() {
    const res = { set: jest.fn() };
    return res as unknown as import("express").Response;
  }

  it("retorna buffer con headers Content-Disposition para entidad valida", async () => {
    const buffer = Buffer.from('{"organizaciones":[]}', "utf-8");
    const { controller, service } = buildSut({
      exportarCerif: jest.fn().mockResolvedValue({
        buffer,
        filename: "cerif-todo.json",
        scope: "todo",
      }),
    });
    const res = mockRes();

    const result = await controller.getCerif("todo", actor, res);

    expect(result).toBe(buffer);
    expect(res.set).toHaveBeenCalledWith({
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="cerif-todo.json"',
    });
    expect(service.exportarCerif).toHaveBeenCalledWith("todo", actor);
  });

  it("retorna buffer para entidad null (scope todo)", async () => {
    const buffer = Buffer.from('{}', "utf-8");
    const { controller, service } = buildSut({
      exportarCerif: jest.fn().mockResolvedValue({
        buffer,
        filename: "cerif-todo.json",
        scope: "todo",
      }),
    });
    const res = mockRes();

    const result = await controller.getCerif(undefined, actor, res);

    expect(result).toBe(buffer);
    expect(service.exportarCerif).toHaveBeenCalledWith(null, actor);
  });

  it("propaga AppError.validation para entidad invalida", async () => {
    const { controller } = buildSut({
      exportarCerif: jest.fn().mockImplementation(() => {
        throw AppError.validation("Entidad CERIF desconocida: 'invalido'");
      }),
    });
    const res = mockRes();

    await expect(controller.getCerif("invalido", actor, res)).rejects.toThrow(
      "Entidad CERIF desconocida",
    );
  });
});
