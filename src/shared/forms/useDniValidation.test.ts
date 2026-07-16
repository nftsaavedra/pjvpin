import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDniValidation } from "./useDniValidation";
import type { ReniecDniLookupResult } from "@/shared/tauri/types";

const reniecMock: ReniecDniLookupResult = {
  first_name: "juan carlos",
  first_last_name: "lopez gonzalez",
  second_last_name: "ramirez diaz",
  full_name: "Juan Carlos Lopez Ramirez",
  document_number: "45678912",
};

describe("useDniValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in idle state with empty fields", () => {
    const { result } = renderHook(() => useDniValidation({ consultar: vi.fn() }));
    expect(result.current.dni).toBe("");
    expect(result.current.nombres).toBe("");
    expect(result.current.apellidoPaterno).toBe("");
    expect(result.current.apellidoMaterno).toBe("");
    expect(result.current.status).toBe("idle");
    expect(result.current.isValidated).toBe(false);
    expect(result.current.puedeValidar).toBe(false);
  });

  it("rejects non-numeric or short DNI before validation", () => {
    const { result } = renderHook(() => useDniValidation({ consultar: vi.fn() }));
    act(() => {
      result.current.setDni("12345abc");
    });
    expect(result.current.dni).toBe("12345");
    expect(result.current.puedeValidar).toBe(false);
  });

  it("enables validation only with 8 numeric digits", () => {
    const { result } = renderHook(() => useDniValidation({ consultar: vi.fn() }));
    act(() => {
      result.current.setDni("45678912");
    });
    expect(result.current.dniLimpio).toBe("45678912");
    expect(result.current.puedeValidar).toBe(true);
  });

  it("clears identity when DNI changes after a validation", async () => {
    const consultar = vi.fn().mockResolvedValue(reniecMock);
    const { result } = renderHook(() => useDniValidation({ consultar }));
    act(() => {
      result.current.setDni("45678912");
    });
    await act(async () => {
      await result.current.handleValidar();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("validated");
    });
    expect(result.current.nombres).toBe("Juan Carlos");

    act(() => {
      result.current.setDni("45678913");
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.nombres).toBe("");
  });

  it("populates names from RENIEC response and capitalizes them", async () => {
    const consultar = vi.fn().mockResolvedValue(reniecMock);
    const { result } = renderHook(() => useDniValidation({ consultar }));
    act(() => {
      result.current.setDni("45678912");
    });
    await act(async () => {
      await result.current.handleValidar();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("validated");
    });
    expect(result.current.nombres).toBe("Juan Carlos");
    expect(result.current.apellidoPaterno).toBe("Lopez Gonzalez");
    expect(result.current.apellidoMaterno).toBe("Ramirez Diaz");
    expect(result.current.isValidated).toBe(true);
    expect(result.current.nombreCompletoPreview).toBe("Juan Carlos Lopez Gonzalez Ramirez Diaz");
  });

  it("transitions to error state when RENIEC rejects the DNI", async () => {
    const consultar = vi.fn().mockRejectedValue(new Error("DNI no encontrado"));
    const { result } = renderHook(() => useDniValidation({ consultar }));
    act(() => {
      result.current.setDni("45678912");
    });
    await act(async () => {
      await result.current.handleValidar();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.nombres).toBe("");
    expect(result.current.isValidated).toBe(false);
  });

  it("blocks validation when duplicate is detected via chequearDuplicado", async () => {
    const consultar = vi.fn();
    const chequearDuplicado = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useDniValidation({ consultar, chequearDuplicado }));
    act(() => {
      result.current.setDni("45678912");
    });
    await act(async () => {
      await result.current.handleValidar();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("duplicate");
    });
    expect(consultar).not.toHaveBeenCalled();
  });

  it("loadFromPersona sets all fields and marks validated", () => {
    const { result } = renderHook(() => useDniValidation({ consultar: vi.fn() }));
    act(() => {
      result.current.loadFromPersona({
        dni: "45678912",
        nombres: "Maria",
        apellidoPaterno: "Perez",
        apellidoMaterno: "Lopez",
      });
    });
    expect(result.current.dni).toBe("45678912");
    expect(result.current.nombres).toBe("Maria");
    expect(result.current.apellidoPaterno).toBe("Perez");
    expect(result.current.isValidated).toBe(true);
    expect(result.current.status).toBe("validated");
  });

  it("reset clears all state", () => {
    const { result } = renderHook(() => useDniValidation({ consultar: vi.fn() }));
    act(() => {
      result.current.setDni("45678912");
      result.current.setNombres("Test");
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.dni).toBe("");
    expect(result.current.nombres).toBe("");
    expect(result.current.status).toBe("idle");
  });
});
