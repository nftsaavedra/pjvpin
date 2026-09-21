import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { AppError } from "./app-error";
import { AppErrorFilter } from "./app-error.filter";

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function makeHost(): { host: ArgumentsHost; res: MockResponse } {
  const res: MockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({}),
    }),
    getArgByIndex: (index: number) => (index === 1 ? res : {}),
  } as unknown as ArgumentsHost;
  return { host, res };
}

function makeFilter(): { filter: AppErrorFilter; res: MockResponse; host: ArgumentsHost } {
  const adapterHost = {
    httpAdapter: {
      reply: jest.fn(),
      isHeadersSent: jest.fn().mockReturnValue(false),
    },
  } as unknown as HttpAdapterHost;
  const filter = new AppErrorFilter(adapterHost);
  const { host, res } = makeHost();
  return { filter, res, host };
}

describe("AppErrorFilter", () => {
  describe("AppError domain variants", () => {
    const cases: Array<[string, () => AppError, number]> = [
      ["ValidationError", () => AppError.validation("v"), 400],
      ["NotFound", () => AppError.notFound("n"), 404],
      ["UniqueConstraintViolation", () => AppError.unique("u"), 409],
      ["ReferentialIntegrity", () => AppError.referential("r"), 409],
      ["DataInconsistency", () => AppError.dataInconsistency("d"), 409],
      ["ConfigurationError", () => AppError.config("c"), 503],
      ["ExternalServiceError", () => AppError.external("e"), 502],
      ["DatabaseError", () => AppError.database("d"), 500],
      ["InternalError", () => AppError.internal("i"), 500],
    ];

    for (const [name, build, expectedStatus] of cases) {
      it(`maps ${name} to status ${expectedStatus}`, () => {
        const { filter, res, host } = makeFilter();
        filter.catch(build(), host);
        expect(res.status).toHaveBeenCalledWith(expectedStatus);
        expect(res.json).toHaveBeenCalledWith({
          statusCode: expectedStatus,
          message: expect.any(String),
          error: name,
        });
      });
    }
  });

  describe("HttpException native (delegated to BaseExceptionFilter)", () => {
    it("UnauthorizedException keeps 401 and NestJS body", () => {
      const { filter, res, host } = makeFilter();
      const spy = jest.spyOn(Object.getPrototypeOf(AppErrorFilter.prototype), "catch");
      filter.catch(new UnauthorizedException("nope"), host);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("BadRequestException routes through BaseExceptionFilter (not 500)", () => {
      const { filter, res, host } = makeFilter();
      filter.catch(new BadRequestException("bad"), host);
      expect(res.status).not.toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("NotFoundException, ForbiddenException, ConflictException all delegated", () => {
      for (const ex of [
        new NotFoundException(),
        new ForbiddenException(),
        new ConflictException(),
      ]) {
        const { filter, res, host } = makeFilter();
        filter.catch(ex, host);
        expect(res.status).not.toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe("Mongo E11000", () => {
    it("maps duplicate-key error to 409 with friendly message", () => {
      const { filter, res, host } = makeFilter();
      const err = Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern: { dni: 1 } });
      filter.catch(err as unknown, host);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: "El DNI ya esta registrado.",
        error: "UniqueConstraintViolation",
      });
    });
  });

  describe("Fallback", () => {
    it("unknown error → 500 InternalError", () => {
      const { filter, res, host } = makeFilter();
      filter.catch(new Error("boom"), host);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: "Error interno del servidor.",
        error: "InternalError",
      });
    });
  });
});
