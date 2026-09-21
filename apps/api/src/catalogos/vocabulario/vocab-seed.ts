/**
 * Seed embebido de los 15 vocabularios controlados CONCYTEC (SKOS).
 * Port del Rust legacy `apps/desktop/src-tauri/src/catalogos/seed_vocabularios.rs`.
 *
 * Origen canonico: https://conocimiento.concytec.gob.pe/vocabularios/.
 * La importacion completa desde los XLSX oficiales queda como TODO para una
 * fase posterior (requiere calamine o quick-xml). Este subconjunto representativo
 * se carga via `reimportar(esquema)` para validar el contrato de FK y los tests.
 *
 * Convenciones:
 * - `tipo = esquema` (reusa la UI legacy).
 * - `codigo_skos` = notation oficial SKOS.
 * - `padre_codigo` referencia dentro del mismo esquema (jerarquia OCDE FORD).
 * - `editable = 0` para vocabularios oficiales CONCYTEC.
 */
export interface VocabSeedEntry {
  esquema: string;
  codigo_skos: string;
  codigo_interno: string;
  nombre: string;
  padre_codigo: string | null;
  nivel: number;
}

export const VOCAB_SEED: ReadonlyArray<VocabSeedEntry> = [
  // 1. OCDE FORD (jerarquia 3 niveles)
  { esquema: "ocde_ford", codigo_skos: "1", codigo_interno: "ciencias_naturales", nombre: "Ciencias Naturales", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_ford", codigo_skos: "1.1", codigo_interno: "matematicas", nombre: "Matematicas", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.2", codigo_interno: "ciencias_computacion", nombre: "Ciencias de la Computacion e Informatica", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.3", codigo_interno: "ciencias_fisicas", nombre: "Ciencias Fisicas", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.4", codigo_interno: "ciencias_quimicas", nombre: "Ciencias Quimicas", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.5", codigo_interno: "ciencias_tierra", nombre: "Ciencias de la Tierra y del Medio Ambiente", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.6", codigo_interno: "ciencias_biologicas", nombre: "Ciencias Biologicas", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "1.7", codigo_interno: "otras_naturales", nombre: "Otras Ciencias Naturales", padre_codigo: "1", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2", codigo_interno: "ingenierias_tecnologias", nombre: "Ingenierias y Tecnologias", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_ford", codigo_skos: "2.1", codigo_interno: "ing_civil", nombre: "Ingenieria Civil", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.2", codigo_interno: "ing_electrica_electronica", nombre: "Ingenieria Electrica, Electronica e Informatica", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.3", codigo_interno: "ing_mecanica", nombre: "Ingenieria Mecanica", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.4", codigo_interno: "ing_quimica", nombre: "Ingenieria Quimica", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.5", codigo_interno: "ing_materiales", nombre: "Ingenieria de los Materiales", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.10", codigo_interno: "ing_medioambiente", nombre: "Ingenieria del Medio Ambiente", padre_codigo: "2", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "2.10.02", codigo_interno: "ing_ambiental", nombre: "Ingenieria Ambiental", padre_codigo: "2.10", nivel: 3 },
  { esquema: "ocde_ford", codigo_skos: "3", codigo_interno: "ciencias_medicas_salud", nombre: "Ciencias Medicas y de la Salud", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_ford", codigo_skos: "3.1", codigo_interno: "medicina_basica", nombre: "Medicina Basica", padre_codigo: "3", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "3.2", codigo_interno: "medicina_clinica", nombre: "Medicina Clinica", padre_codigo: "3", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "3.3", codigo_interno: "ciencias_salud", nombre: "Ciencias de la Salud", padre_codigo: "3", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "4", codigo_interno: "ciencias_agricolas", nombre: "Ciencias Agricolas", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_ford", codigo_skos: "5", codigo_interno: "ciencias_sociales", nombre: "Ciencias Sociales", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_ford", codigo_skos: "5.2", codigo_interno: "economia", nombre: "Economia y Negocios", padre_codigo: "5", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "5.3", codigo_interno: "ciencias_educacion", nombre: "Ciencias de la Educacion", padre_codigo: "5", nivel: 2 },
  { esquema: "ocde_ford", codigo_skos: "6", codigo_interno: "humanidades", nombre: "Humanidades", padre_codigo: null, nivel: 1 },

  // 2. OCDE tipo_ocupacion (Frascati)
  { esquema: "ocde_tipo_ocupacion", codigo_skos: "investigadores", codigo_interno: "investigadores", nombre: "Investigadores", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_ocupacion", codigo_skos: "tecnicos", codigo_interno: "tecnicos", nombre: "Tecnicos y personal asimilado", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_ocupacion", codigo_skos: "apoyo", codigo_interno: "apoyo", nombre: "Personal de apoyo", padre_codigo: null, nivel: 1 },

  // 3. OCDE sector_institucional
  { esquema: "ocde_sector_institucional", codigo_skos: "gobierno", codigo_interno: "gobierno", nombre: "Gobierno", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_sector_institucional", codigo_skos: "educacion_superior", codigo_interno: "educacion_superior", nombre: "Ensenanza Superior", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_sector_institucional", codigo_skos: "empresas", codigo_interno: "empresas", nombre: "Empresas", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_sector_institucional", codigo_skos: "privado_sin_fines", codigo_interno: "privado_sin_fines", nombre: "Organizaciones privadas sin fines de lucro", padre_codigo: null, nivel: 1 },

  // 4. OCDE naturaleza_institucion
  { esquema: "ocde_naturaleza_institucion", codigo_skos: "publica", codigo_interno: "publica", nombre: "Publica", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_naturaleza_institucion", codigo_skos: "privada", codigo_interno: "privada", nombre: "Privada", padre_codigo: null, nivel: 1 },

  // 5. OCDE tipo_proyecto (Oslo/Frascati)
  { esquema: "ocde_tipo_proyecto", codigo_skos: "investigacion_basica", codigo_interno: "investigacion_basica", nombre: "Investigacion Basica", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_proyecto", codigo_skos: "investigacion_aplicada", codigo_interno: "investigacion_aplicada", nombre: "Investigacion Aplicada", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_proyecto", codigo_skos: "desarrollo_experimental", codigo_interno: "desarrollo_experimental", nombre: "Desarrollo Experimental", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_proyecto", codigo_skos: "innovacion", codigo_interno: "innovacion", nombre: "Innovacion (Manual de Oslo)", padre_codigo: null, nivel: 1 },
  { esquema: "ocde_tipo_proyecto", codigo_skos: "transferencia", codigo_interno: "transferencia", nombre: "Transferencia Tecnologica", padre_codigo: null, nivel: 1 },

  // 6. SUNEDU tipo_institucion
  { esquema: "sunedu_tipo_institucion", codigo_skos: "universidad", codigo_interno: "universidad", nombre: "Universidad", padre_codigo: null, nivel: 1 },
  { esquema: "sunedu_tipo_institucion", codigo_skos: "instituto", codigo_interno: "instituto", nombre: "Instituto de Educacion Superior", padre_codigo: null, nivel: 1 },
  { esquema: "sunedu_tipo_institucion", codigo_skos: "escuela", codigo_interno: "escuela", nombre: "Escuela de Educacion Superior", padre_codigo: null, nivel: 1 },

  // 7. RENATI level (Grados)
  { esquema: "renati_level", codigo_skos: "bachiller", codigo_interno: "bachiller", nombre: "Bachiller", padre_codigo: null, nivel: 1 },
  { esquema: "renati_level", codigo_skos: "maestro", codigo_interno: "maestro", nombre: "Maestro / Magister", padre_codigo: null, nivel: 1 },
  { esquema: "renati_level", codigo_skos: "doctor", codigo_interno: "doctor", nombre: "Doctor", padre_codigo: null, nivel: 1 },
  { esquema: "renati_level", codigo_skos: "licenciado", codigo_interno: "licenciado", nombre: "Licenciado (Titulo Profesional)", padre_codigo: null, nivel: 1 },
  { esquema: "renati_level", codigo_skos: "segunda_especialidad", codigo_interno: "segunda_especialidad", nombre: "Segunda Especialidad", padre_codigo: null, nivel: 1 },

  // 8. RENATI type
  { esquema: "renati_type", codigo_skos: "tesis", codigo_interno: "tesis", nombre: "Tesis", padre_codigo: null, nivel: 1 },
  { esquema: "renati_type", codigo_skos: "trabajo_investigacion", codigo_interno: "trabajo_investigacion", nombre: "Trabajo de Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "renati_type", codigo_skos: "trabajo_suficiencia", codigo_interno: "trabajo_suficiencia", nombre: "Trabajo de Suficiencia Profesional", padre_codigo: null, nivel: 1 },
  { esquema: "renati_type", codigo_skos: "informe_tecnico", codigo_interno: "informe_tecnico", nombre: "Informe Tecnico", padre_codigo: null, nivel: 1 },

  // 9. CONCYTEC tipo_subunidad
  { esquema: "concytec_tipo_subunidad", codigo_skos: "facultad", codigo_interno: "facultad", nombre: "Facultad", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "departamento_academico", codigo_interno: "departamento_academico", nombre: "Departamento Academico", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "escuela_profesional", codigo_interno: "escuela_profesional", nombre: "Escuela Profesional", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "grupo_investigacion", codigo_interno: "grupo_investigacion", nombre: "Grupo de Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "linea_investigacion", codigo_interno: "linea_investigacion", nombre: "Linea de Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "laboratorio", codigo_interno: "laboratorio", nombre: "Laboratorio de Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_tipo_subunidad", codigo_skos: "vicerrectorado", codigo_interno: "vicerrectorado", nombre: "Vicerrectorado de Investigacion", padre_codigo: null, nivel: 1 },

  // 10. CONCYTEC estado_proyecto
  { esquema: "concytec_estado_proyecto", codigo_skos: "formulacion", codigo_interno: "formulacion", nombre: "Formulacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_estado_proyecto", codigo_skos: "evaluacion", codigo_interno: "evaluacion", nombre: "Evaluacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_estado_proyecto", codigo_skos: "ejecucion", codigo_interno: "ejecucion", nombre: "Ejecucion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_estado_proyecto", codigo_skos: "cierre", codigo_interno: "cierre", nombre: "Cierre", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_estado_proyecto", codigo_skos: "cerrado", codigo_interno: "cerrado", nombre: "Cerrado", padre_codigo: null, nivel: 1 },

  // 11. CONCYTEC equipamiento
  { esquema: "concytec_equipamiento", codigo_skos: "espectrometro", codigo_interno: "espectrometro", nombre: "Espectrometro", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_equipamiento", codigo_skos: "secuenciador", codigo_interno: "secuenciador", nombre: "Secuenciador", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_equipamiento", codigo_skos: "microscopio", codigo_interno: "microscopio", nombre: "Microscopio", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_equipamiento", codigo_skos: "cromatografo", codigo_interno: "cromatografo", nombre: "Cromatografo", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_equipamiento", codigo_skos: "reactor", codigo_interno: "reactor", nombre: "Reactor", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_equipamiento", codigo_skos: "robot_industrial", codigo_interno: "robot_industrial", nombre: "Robot Industrial", padre_codigo: null, nivel: 1 },

  // 12. CONCYTEC uso_equipamiento
  { esquema: "concytec_uso_equipamiento", codigo_skos: "investigacion", codigo_interno: "investigacion", nombre: "Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_uso_equipamiento", codigo_skos: "docencia", codigo_interno: "docencia", nombre: "Docencia", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_uso_equipamiento", codigo_skos: "servicios", codigo_interno: "servicios", nombre: "Servicios a Terceros", padre_codigo: null, nivel: 1 },

  // 13. CONCYTEC terminos
  { esquema: "concytec_terminos", codigo_skos: "masculino", codigo_interno: "masculino", nombre: "Masculino", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "femenino", codigo_interno: "femenino", nombre: "Femenino", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "ambito_local", codigo_interno: "ambito_local", nombre: "Local", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "ambito_regional", codigo_interno: "ambito_regional", nombre: "Regional", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "ambito_nacional", codigo_interno: "ambito_nacional", nombre: "Nacional", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "ambito_internacional", codigo_interno: "ambito_internacional", nombre: "Internacional", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "tipo_org_universidad", codigo_interno: "tipo_org_universidad", nombre: "Universidad", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "tipo_org_instituto", codigo_interno: "tipo_org_instituto", nombre: "Instituto de Investigacion", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "q1", codigo_interno: "q1", nombre: "Q1", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "q2", codigo_interno: "q2", nombre: "Q2", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "q3", codigo_interno: "q3", nombre: "Q3", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "q4", codigo_interno: "q4", nombre: "Q4", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "wos_q1", codigo_interno: "wos_q1", nombre: "Q1 (WoS)", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "wos_q2", codigo_interno: "wos_q2", nombre: "Q2 (WoS)", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "wos_q3", codigo_interno: "wos_q3", nombre: "Q3 (WoS)", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "wos_q4", codigo_interno: "wos_q4", nombre: "Q4 (WoS)", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "articulo", codigo_interno: "articulo", nombre: "Articulo", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "articulo_revista", codigo_interno: "articulo_revista", nombre: "Journal article", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "articulo_conferencia", codigo_interno: "articulo_conferencia", nombre: "Conference paper", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "carta", codigo_interno: "carta", nombre: "Carta / Letter", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "resena", codigo_interno: "resena", nombre: "Resena / Review", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "comunicacion_congreso", codigo_interno: "comunicacion_congreso", nombre: "Comunicacion de congreso", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "libro", codigo_interno: "libro", nombre: "Libro", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "capitulo_libro", codigo_interno: "capitulo_libro", nombre: "Capitulo de libro", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "software", codigo_interno: "software", nombre: "Software", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "acceso_abierto", codigo_interno: "acceso_abierto", nombre: "Acceso Abierto", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "solo_metadatos", codigo_interno: "solo_metadatos", nombre: "Solo Metadatos", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "embargado", codigo_interno: "embargado", nombre: "Embargado", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "modalidad_i+d", codigo_interno: "modalidad_i+d", nombre: "I+D+i", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "modalidad_equipamiento", codigo_interno: "modalidad_equipamiento", nombre: "Equipamiento", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "modalidad_pasantias", codigo_interno: "modalidad_pasantias", nombre: "Pasantias", padre_codigo: null, nivel: 1 },
  { esquema: "concytec_terminos", codigo_skos: "modalidad_eventos", codigo_interno: "modalidad_eventos", nombre: "Eventos Academicos", padre_codigo: null, nivel: 1 },

  // 14. MINAM tematicas ambientales
  { esquema: "minam_tematicas_ambientales", codigo_skos: "cambio_climatico", codigo_interno: "cambio_climatico", nombre: "Cambio Climatico", padre_codigo: null, nivel: 1 },
  { esquema: "minam_tematicas_ambientales", codigo_skos: "biodiversidad", codigo_interno: "biodiversidad", nombre: "Biodiversidad", padre_codigo: null, nivel: 1 },
  { esquema: "minam_tematicas_ambientales", codigo_skos: "calidad_ambiental", codigo_interno: "calidad_ambiental", nombre: "Calidad Ambiental", padre_codigo: null, nivel: 1 },
  { esquema: "minam_tematicas_ambientales", codigo_skos: "recursos_hidricos", codigo_interno: "recursos_hidricos", nombre: "Recursos Hidricos", padre_codigo: null, nivel: 1 },

  // 15. INS tematicas salud
  { esquema: "ins_tematicas_salud", codigo_skos: "salud_publica", codigo_interno: "salud_publica", nombre: "Salud Publica", padre_codigo: null, nivel: 1 },
  { esquema: "ins_tematicas_salud", codigo_skos: "enfermedades_infecciosas", codigo_interno: "enfermedades_infecciosas", nombre: "Enfermedades Infecciosas", padre_codigo: null, nivel: 1 },
  { esquema: "ins_tematicas_salud", codigo_skos: "nutricion", codigo_interno: "nutricion", nombre: "Nutricion", padre_codigo: null, nivel: 1 },
  { esquema: "ins_tematicas_salud", codigo_skos: "salud_mental", codigo_interno: "salud_mental", nombre: "Salud Mental", padre_codigo: null, nivel: 1 },
];

export const VOCAB_SEED_ESQUEMAS = Array.from(new Set(VOCAB_SEED.map((e) => e.esquema))).sort();
