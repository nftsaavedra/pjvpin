import { describe, it, expect } from "vitest";
import { parseDniList } from "./parseDniList";

describe("parseDniList", () => {
  it("devuelve vacio para string vacio", () => {
    expect(parseDniList("")).toEqual({ validos: [], invalidos: [] });
  });

  it("acepta DNIs separados por saltos de linea", () => {
    expect(parseDniList("45678912\n87654321\n12345678")).toEqual({
      validos: ["45678912", "87654321", "12345678"],
      invalidos: [],
    });
  });

  it("acepta DNIs separados por comas y espacios", () => {
    expect(parseDniList("45678912,87654321,12345678")).toEqual({
      validos: ["45678912", "87654321", "12345678"],
      invalidos: [],
    });
    expect(parseDniList("45678912 87654321 12345678")).toEqual({
      validos: ["45678912", "87654321", "12345678"],
      invalidos: [],
    });
  });

  it("mezcla separadores sin problema", () => {
    expect(parseDniList("45678912, 87654321\n12345678 ; 11111111")).toEqual({
      validos: ["45678912", "87654321", "12345678", "11111111"],
      invalidos: [],
    });
  });

  it("ignora silenciosamente DNIs duplicados (mantiene el primero)", () => {
    expect(parseDniList("45678912\n45678912\n87654321")).toEqual({
      validos: ["45678912", "87654321"],
      invalidos: [],
    });
  });

  it("separa invalidos (no 8 digitos o con letras)", () => {
    expect(parseDniList("45678912\n12345abc\n8765\n87654321")).toEqual({
      validos: ["45678912", "87654321"],
      invalidos: ["12345abc", "8765"],
    });
  });

  it("ignora lineas vacias", () => {
    expect(parseDniList("\n\n45678912\n\n  \n87654321\n")).toEqual({
      validos: ["45678912", "87654321"],
      invalidos: [],
    });
  });

  it("normaliza espacios alrededor de cada token", () => {
    expect(parseDniList("  45678912  ,  87654321  ")).toEqual({
      validos: ["45678912", "87654321"],
      invalidos: [],
    });
  });

  it("rechaza DNIs con mas de 8 digitos", () => {
    expect(parseDniList("456789123\n45678912")).toEqual({
      validos: ["45678912"],
      invalidos: ["456789123"],
    });
  });
});
