/**
 * Service del módulo `cerif` — orquesta la construcción del documento
 * CERIF (`pjvpin/cerif-json/0.1`).
 *
 * Port de `build_cerif_document` de `apps/desktop/src-tauri/src/reportes/cerif.rs`.
 * Delega la carga de datos a `CerifRepository` y la transformación a los
 * mappers puros de `cerif.logic.ts`.
 */

import { Injectable } from "@nestjs/common";
import {
  cerifOrgUnitFrom,
  cerifPatenteFrom,
  cerifPersonFrom,
  cerifProyectoFrom,
  cerifPublicacionFrom,
} from "./cerif.logic";
import type { CerifDocument, CerifScope } from "./dto/cerif.dto";
import { CerifRepository } from "./cerif.repository";

@Injectable()
export class CerifService {
  constructor(private readonly repo: CerifRepository) {}

  async buildCerifDocument(scope: CerifScope): Promise<CerifDocument> {
    const doc: CerifDocument = {
      schema: "pjvpin/cerif-json/0.1",
      generado_en: Date.now(),
      organizaciones: [],
      personas: [],
      proyectos: [],
      publicaciones: [],
      patentes: [],
    };

    const loadAll = scope === "todo";

    if (loadAll || scope === "organizaciones") {
      const orgs = await this.repo.loadOrgUnits();
      doc.organizaciones = orgs.map(({ org, ocde }) => cerifOrgUnitFrom(org, ocde));
    }

    if (loadAll || scope === "personas") {
      const [personas, investigadores] = await Promise.all([
        this.repo.loadPersonas(),
        this.repo.loadInvestigadores(),
      ]);
      const personasMap = new Map(personas.map((p) => [p.id_persona, p]));
      doc.personas = investigadores
        .map((inv) => {
          const p = personasMap.get(inv.persona_id);
          return p ? cerifPersonFrom(p, inv) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.id_persona.localeCompare(b.id_persona));
    }

    if (loadAll || scope === "proyectos") {
      const [proyectos, personas, investigadores] = await Promise.all([
        this.repo.loadProyectos(),
        this.repo.loadPersonas(),
        this.repo.loadInvestigadores(),
      ]);
      const personasMap = new Map(personas.map((p) => [p.id_persona, p]));
      const invMap = new Map(investigadores.map((i) => [i.id_investigador, i]));

      doc.proyectos = proyectos.map(({ proyecto, participaciones, financiamientos, organizaciones, ocde }) =>
        cerifProyectoFrom(
          proyecto,
          participaciones,
          personasMap,
          invMap,
          financiamientos,
          organizaciones.map((o) => ({ id_org_unit: o.id_org_unit, nombre: null, rol: o.rol })),
          ocde,
        ),
      );

      // Enriquecer nombres de organizaciones en proyectos
      if (doc.organizaciones.length > 0 || loadAll) {
        const orgsMap = new Map(
          (doc.organizaciones.length > 0
            ? doc.organizaciones
            : (await this.repo.loadOrgUnits()).map(({ org, ocde }) => cerifOrgUnitFrom(org, ocde))
          ).map((o) => [o.id_org_unit, o.nombre]),
        );
        for (const proy of doc.proyectos) {
          for (const org of proy.organizaciones) {
            org.nombre = orgsMap.get(org.id_org_unit) ?? null;
          }
        }
      }
    }

    if (loadAll || scope === "publicaciones") {
      const [publicaciones, personas] = await Promise.all([
        this.repo.loadPublicaciones(),
        this.repo.loadPersonas(),
      ]);
      const personasMap = new Map(personas.map((p) => [p.id_persona, p]));
      doc.publicaciones = publicaciones.map(({ pub, autores }) =>
        cerifPublicacionFrom(pub, autores, personasMap),
      );
    }

    if (loadAll || scope === "patentes") {
      const [patentes, personas, orgUnits] = await Promise.all([
        this.repo.loadPatentes(),
        this.repo.loadPersonas(),
        this.repo.loadOrgUnits(),
      ]);
      const personasMap = new Map(personas.map((p) => [p.id_persona, p]));
      const orgsMap = new Map(orgUnits.map(({ org }) => [org.id_org_unit, org]));
      doc.patentes = patentes.map(({ patente, inventores, titulares, ocde }) =>
        cerifPatenteFrom(patente, inventores, titulares, personasMap, orgsMap, ocde),
      );
    }

    return doc;
  }
}
