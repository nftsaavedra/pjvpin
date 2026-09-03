import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Module } from "@nestjs/common";
import * as supertest from "supertest";
const request = supertest.default ?? supertest;
import { AppModule } from "../src/app.module";
import { AppErrorFilter } from "../src/infra/errors/app-error.filter";
import { MONGO_DB } from "../src/infra/mongo/mongo.module";
import type { Db } from "mongodb";

// Mock ESM modules that Jest can't transform (pnpm virtual store)
jest.mock("@nestjs/event-emitter", () => {
  class EventEmitter2 {
    emit = jest.fn();
    on = jest.fn();
    off = jest.fn();
  }
  return {
    EventEmitter2,
    OnEvent: () => () => {},
    EventEmitterModule: {
      forRoot: () => ({
        module: class MockEventEmitterModule {},
        global: true,
        providers: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
        exports: [EventEmitter2],
      }),
    },
  };
});

jest.mock("@nestjs/websockets", () => ({
  WebSocketGateway: () => () => {},
  WebSocketServer: () => () => {},
}));

jest.mock("@nestjs/platform-socket.io", () => ({}));

jest.mock("socket.io", () => ({
  Server: class MockServer {
    to = jest.fn().mockReturnThis();
    emit = jest.fn();
  },
}));

// Mock WsModule to avoid dependency chain (EventEmitter2 + JwtService)
jest.mock("../src/ws/ws.module", () => {
  @Module({})
  class MockWsModule {}
  return { WsModule: MockWsModule };
});

// Mock JobRegistry to avoid EventEmitter2 dependency
jest.mock("../src/external-http/job-registry.service", () => {
  class JobRegistry {
    crear = jest.fn();
    enEjecucion = jest.fn();
    incrementar = jest.fn();
    completar = jest.fn();
    fallar = jest.fn();
    obtener = jest.fn();
  }
  return { JobRegistry };
});

jest.mock("@nestjs/websockets", () => ({
  WebSocketGateway: () => () => {},
  WebSocketServer: () => () => {},
}));

jest.mock("@nestjs/platform-socket.io", () => ({}));

jest.mock("socket.io", () => ({
  Server: class MockServer {
    to = jest.fn().mockReturnThis();
    emit = jest.fn();
  },
}));

let app: INestApplication;
let db: Db;

beforeAll(async () => {
  process.env.PJVPIN_MONGODB_URI = "mongodb://localhost:27017";
  process.env.PJVPIN_MONGODB_DB = "pjvpin_e2e";
  process.env.JWT_ACCESS_SECRET = "test-secret-e2e-only";
  process.env.JWT_ACCESS_TTL = "1h";
  process.env.PJVPIN_AUDIT_LOG_PATH = "/dev/null";

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AppErrorFilter());
  await app.init();

  db = app.get<Db>(MONGO_DB);
  await db.dropDatabase();
}, 30000);

afterAll(async () => {
  if (db) await db.dropDatabase();
  if (app) await app.close();
}, 15000);

describe("Health", () => {
  it("GET /health → 200 con ok=true", () => {
    return request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("ok", true);
        expect(res.body).toHaveProperty("has_users");
        expect(res.body).toHaveProperty("requires_setup");
        expect(res.body).toHaveProperty("version");
      });
  });
});

describe("Auth flow", () => {
  let accessToken: string;

  it("POST /auth/bootstrap → 201 crea superuser", () => {
    return request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap")
      .send({
        username: "admin",
        password: "Admin123!",
        dni: "12345678",
        nombres: "Admin",
        apellidoPaterno: "Test",
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty("id_usuario");
        expect(res.body).toHaveProperty("username", "admin");
        expect(res.body).toHaveProperty("rol", "superuser");
      });
  });

  it("POST /auth/login → 200 con tokens", () => {
    return request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin123!" })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("user");
        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("refreshToken");
        accessToken = res.body.accessToken;
      });
  });

  it("GET /auth/session → 200 con usuario autenticado", () => {
    return request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("username", "admin");
        expect(res.body).toHaveProperty("rol", "superuser");
      });
  });

  it("GET /auth/session sin token → 401", () => {
    return request(app.getHttpServer()).get("/api/v1/auth/session").expect(401);
  });
});

describe("Contract: responses use snake_case keys", () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin123!" });
    accessToken = res.body.accessToken;
  });

  it("GET /auth/session → keys snake_case (id_usuario, nombre_completo)", () => {
    return request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("id_usuario");
        expect(res.body).toHaveProperty("nombre_completo");
        expect(res.body).not.toHaveProperty("idUsuario");
        expect(res.body).not.toHaveProperty("nombreCompleto");
      });
  });

  it("GET /health → keys snake_case (has_users, requires_setup)", () => {
    return request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("has_users");
        expect(res.body).toHaveProperty("requires_setup");
        expect(res.body).not.toHaveProperty("hasUsers");
        expect(res.body).not.toHaveProperty("requiresSetup");
      });
  });
});

describe("Contract: requests accept camelCase (pipe transforms)", () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin123!" });
    accessToken = res.body.accessToken;
  });

  it("POST /grados con nombre → 201", () => {
    return request(app.getHttpServer())
      .post("/api/v1/grados")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nombre: "Doctor", descripcion: "Grado doctoral" })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty("nombre", "Doctor");
      });
  });
});

describe("RBAC", () => {
  it("POST /grados sin token → 401", () => {
    return request(app.getHttpServer())
      .post("/api/v1/grados")
      .send({ nombre: "Test" })
      .expect(401);
  });
});
