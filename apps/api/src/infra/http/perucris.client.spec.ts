/**
 * Tests del cliente HTTP de PeruCRIS (`pushCerif`). Cubre las5ramas:
 * sin key→config, 401→config, 403→config, 2xx→status, red→external.
 */
import { PeruCrisClient } from "./perucris.client";

describe("PeruCrisClient.pushCerif", () => {
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

  function buildClient(apiKey?: string): PeruCrisClient {
    const config = {
      get: (key: string) => {
        if (key === "PJVPIN_PERUCRIS_API_KEY") return apiKey;
        if (key === "PJVPIN_PERUCRIS_API_BASE_URL") return "https://perucris.example.org";
        if (key === "PJVPIN_PERUCRIS_PUBLIC_API_BASE_URL") return "https://public.perucris.example.org";
        return undefined;
      },
    };
    return new PeruCrisClient(config as never);
  }

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it("lanza AppError.config si falta la api-key", async () => {
    const client = buildClient(undefined);
    await expect(client.pushCerif({})).rejects.toThrow(
      "Falta configurar PJVPIN_PERUCRIS_API_KEY",
    );
  });

  it("lanza AppError.config en HTTP 401 (key invalida)", async () => {
    const client = buildClient("valid-key");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    } as unknown as Response);

    await expect(client.pushCerif({ data: "test" })).rejects.toThrow(
      "api-key de PeruCRIS es invalida",
    );
  });

  it("lanza AppError.config en HTTP 403 (sin permisos)", async () => {
    const client = buildClient("valid-key");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    } as unknown as Response);

    await expect(client.pushCerif({})).rejects.toThrow("no tiene permisos");
  });

  it("devuelve status HTTP en exito (2xx)", async () => {
    const client = buildClient("valid-key");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as unknown as Response);

    const result = await client.pushCerif({ cerif: "data" });
    expect(result).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://perucris.example.org/cerif/ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "api-key": "valid-key" }),
      }),
    );
  });

  it("lanza AppError.external en error de red", async () => {
    const client = buildClient("valid-key");
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(client.pushCerif({})).rejects.toThrow("fallo de transporte");
  });

  it("lanza AppError.external en HTTP 5xx", async () => {
    const client = buildClient("valid-key");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    } as unknown as Response);

    await expect(client.pushCerif({})).rejects.toThrow("respondio 500");
  });
});
