import { snakeToCamelKeys, camelToSnakeKeys } from "./camel-case";

describe("snakeToCamelKeys", () => {
  it("convierte keys snake_case a camelCase", () => {
    expect(snakeToCamelKeys({ id_grado: "1", nombre_completo: "Juan" })).toEqual({
      idGrado: "1",
      nombreCompleto: "Juan",
    });
  });

  it("es idempotente (ya camelCase no se dobla)", () => {
    expect(snakeToCamelKeys({ idGrado: "1", nombreCompleto: "Juan" })).toEqual({
      idGrado: "1",
      nombreCompleto: "Juan",
    });
  });

  it("maneja objetos anidados", () => {
    expect(
      snakeToCamelKeys({
        persona_data: { apellido_paterno: "Perez", dni_numero: "12345678" },
      }),
    ).toEqual({
      personaData: { apellidoPaterno: "Perez", dniNumero: "12345678" },
    });
  });

  it("maneja arrays de objetos", () => {
    expect(snakeToCamelKeys([{ id_investigador: "1" }, { id_investigador: "2" }])).toEqual([
      { idInvestigador: "1" },
      { idInvestigador: "2" },
    ]);
  });

  it("preserva null y undefined", () => {
    expect(snakeToCamelKeys(null)).toBeNull();
    expect(snakeToCamelKeys(undefined)).toBeUndefined();
  });

  it("preserva Date sin transformar", () => {
    const d = new Date();
    expect(snakeToCamelKeys(d)).toBe(d);
  });

  it("preserva Buffer sin transformar", () => {
    const buf = Buffer.from("hello");
    expect(snakeToCamelKeys(buf)).toBe(buf);
  });

  it("preserva primitivos", () => {
    expect(snakeToCamelKeys("texto")).toBe("texto");
    expect(snakeToCamelKeys(42)).toBe(42);
    expect(snakeToCamelKeys(true)).toBe(true);
  });

  it("no transforma keys single-word", () => {
    expect(snakeToCamelKeys({ dni: "12345678", nombres: "Juan" })).toEqual({
      dni: "12345678",
      nombres: "Juan",
    });
  });

  it("maneja keys con numeros", () => {
    expect(snakeToCamelKeys({ id_2fa: "x", version_3: 1 })).toEqual({
      id2fa: "x",
      version3: 1,
    });
  });
});

describe("camelToSnakeKeys", () => {
  it("convierte keys camelCase a snake_case", () => {
    expect(camelToSnakeKeys({ idGrado: "1", nombreCompleto: "Juan" })).toEqual({
      id_grado: "1",
      nombre_completo: "Juan",
    });
  });

  it("es idempotente (ya snake_case no se dobla)", () => {
    expect(camelToSnakeKeys({ id_grado: "1", nombre_completo: "Juan" })).toEqual({
      id_grado: "1",
      nombre_completo: "Juan",
    });
  });

  it("maneja objetos anidados", () => {
    expect(
      camelToSnakeKeys({
        personaData: { apellidoPaterno: "Perez" },
      }),
    ).toEqual({
      persona_data: { apellido_paterno: "Perez" },
    });
  });

  it("maneja arrays de objetos", () => {
    expect(camelToSnakeKeys([{ idInvestigador: "1" }])).toEqual([{ id_investigador: "1" }]);
  });

  it("preserva null y undefined", () => {
    expect(camelToSnakeKeys(null)).toBeNull();
    expect(camelToSnakeKeys(undefined)).toBeUndefined();
  });

  it("preserva Date sin transformar", () => {
    const d = new Date();
    expect(camelToSnakeKeys(d)).toBe(d);
  });

  it("preserva Buffer sin transformar", () => {
    const buf = Buffer.from("hello");
    expect(camelToSnakeKeys(buf)).toBe(buf);
  });

  it("no transforma keys single-word", () => {
    expect(camelToSnakeKeys({ dni: "12345678", nombres: "Juan" })).toEqual({
      dni: "12345678",
      nombres: "Juan",
    });
  });

  it("maneja acronimos correctamente", () => {
    expect(camelToSnakeKeys({ perucrisUuid: "abc", purePersonId: "def" })).toEqual({
      perucris_uuid: "abc",
      pure_person_id: "def",
    });
  });
});

describe("round-trip", () => {
  it("snake → camel → snake preserva keys originales", () => {
    const original = {
      id_investigador: "1",
      nombre_completo: "Juan Perez",
      renacyt_codigo_registro: "R123",
      grupo_investigacion_id: "g1",
    };
    expect(camelToSnakeKeys(snakeToCamelKeys(original))).toEqual(original);
  });

  it("camel → snake → camel preserva keys originales", () => {
    const original = {
      idInvestigador: "1",
      nombreCompleto: "Juan Perez",
      renacytCodigoRegistro: "R123",
      grupoInvestigacionId: "g1",
    };
    expect(snakeToCamelKeys(camelToSnakeKeys(original))).toEqual(original);
  });
});
