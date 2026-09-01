import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession, MongoClient } from "mongodb";
import { MongoServerError } from "mongodb";
import { randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { AppError } from "../infra/errors/app-error";
import { InvestigadoresRepository } from "../investigadores/investigadores.repository";
import { MONGO_CLIENT } from "../infra/mongo/mongo.module";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { UsuariosRepository } from "../usuarios/usuarios.repository";
import { CreateEquipamientoDto, UpdateEquipamientoDto, EquipamientoDto } from "./dto/equipamiento.dto";
import { CreateFinanciamientoDto, UpdateFinanciamientoDto, FinanciamientoDto } from "./dto/financiamiento.dto";
import { CreatePatenteDto, PatenteDto, UpdatePatenteDto } from "./dto/patente.dto";
import {
  PatenteInventorDto,
  PatenteTitularDto,
  VincularInventorDto,
  VincularTitularDto,
} from "./dto/pivot-patente.dto";
import {
  RecursosRbacActor,
  RecursosRbacDeps,
  requireRecursosManageOrResponsable,
  requireRecursosManageOrResponsableForPatente,
  validarFechasFinanciamiento,
  validarFinanciamientoNoSelfParent,
  validarMonedaODefault,
  validarMontoFinito,
  validarPatenteTipo,
  validarTitularHolderExactlyOne,
  validarOrdenPivot,
} from "./recursos.logic";
import { RecursosRepository } from "./recursos.repository";

const MAX_CODIGO_LENGTH = 64;

@Injectable()
export class RecursosService {
  constructor(
    @Inject(MONGO_CLIENT) private readonly client: MongoClient,
    private readonly repo: RecursosRepository,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly investigadoresRepo: InvestigadoresRepository,
    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // PATENTES
  // ============================================================

  async createPatente(
    input: CreatePatenteDto,
    actor: AuthenticatedUser,
  ): Promise<PatenteDto> {
    const proyectoId = this.trimOrNull(input.proyectoId);
    await this.assertManageOrResponsable(actor, proyectoId);

    const titulo = this.trimOrFail(input.titulo, "El titulo de la patente es obligatorio.");
    if (titulo.length === 0) {
      throw AppError.validation("El titulo de la patente es obligatorio.");
    }
    const tipo = validarPatenteTipo(input.tipo);
    const numero = this.trimOrNull(input.numeroPatente);

    if (proyectoId) await this.repo.ensureProyectoExists(proyectoId);
    if (input.idOrgUnitConcedente) {
      await this.ensureEntityExists("org_units", input.idOrgUnitConcedente, "Unidad organizativa");
    }
    if (numero) {
      const dup = await this.repo.findPatenteByNumero(numero);
      if (dup) {
        throw AppError.unique("Ya existe una patente con ese numero de patente.");
      }
    }

    const now = Date.now();
    const id_patente = randomUUID();
    const doc = {
      id_patente,
      proyecto_id: proyectoId,
      titulo,
      numero_patente: numero,
      tipo,
      estado: this.trimOrNull(input.estado),
      fecha_solicitud: input.fechaSolicitud ?? null,
      fecha_concesion: input.fechaConcesion ?? null,
      pais: this.trimOrNull(input.pais),
      entidad_concedente: this.trimOrNull(input.entidadConcedente),
      descripcion: this.trimOrNull(input.descripcion),
      clasificacion_ipc: this.trimOrNull(input.clasificacionIpc),
      id_org_unit_concedente: this.trimOrNull(input.idOrgUnitConcedente),
      created_at: now,
      updated_at: now,
      activo: 1,
    };
    try {
      await this.repo.insertPatente(doc);
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("Ya existe una patente con ese numero de patente.");
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.create",
      "patente",
      id_patente,
      JSON.stringify({ titulo, tipo, proyecto_id: proyectoId }),
    );
    return this.toPatenteDto(doc);
  }

  async updatePatente(
    id: string,
    input: UpdatePatenteDto,
    actor: AuthenticatedUser,
  ): Promise<PatenteDto> {
    const existing = await this.repo.findPatenteById(id);
    if (!existing) {
      throw AppError.notFound("Patente no encontrada.");
    }
    await this.assertManageOrResponsable(actor, existing.proyecto_id);

    const tipo = validarPatenteTipo(input.tipo);
    const numero = this.trimOrNull(input.numeroPatente);

    if (input.idOrgUnitConcedente) {
      await this.ensureEntityExists("org_units", input.idOrgUnitConcedente, "Unidad organizativa");
    }
    if (numero && numero !== existing.numero_patente) {
      const dup = await this.repo.findPatenteByNumero(numero);
      if (dup) {
        throw AppError.unique("Ya existe una patente con ese numero de patente.");
      }
    }

    const set: Partial<PatenteDocLocal> = {};
    if (numero !== existing.numero_patente) set.numero_patente = numero;
    if (tipo !== existing.tipo) set.tipo = tipo;
    const estado = this.trimOrNull(input.estado);
    if (estado !== existing.estado) set.estado = estado;
    if (input.fechaSolicitud !== undefined && input.fechaSolicitud !== existing.fecha_solicitud) {
      set.fecha_solicitud = input.fechaSolicitud;
    }
    if (input.fechaConcesion !== undefined && input.fechaConcesion !== existing.fecha_concesion) {
      set.fecha_concesion = input.fechaConcesion;
    }
    const pais = this.trimOrNull(input.pais);
    if (pais !== existing.pais) set.pais = pais;
    const entidad = this.trimOrNull(input.entidadConcedente);
    if (entidad !== existing.entidad_concedente) set.entidad_concedente = entidad;
    const descripcion = this.trimOrNull(input.descripcion);
    if (descripcion !== existing.descripcion) set.descripcion = descripcion;
    const clasificacion = this.trimOrNull(input.clasificacionIpc);
    if (clasificacion !== existing.clasificacion_ipc) set.clasificacion_ipc = clasificacion;
    const orgUnit = this.trimOrNull(input.idOrgUnitConcedente);
    if (orgUnit !== existing.id_org_unit_concedente) set.id_org_unit_concedente = orgUnit;

    if (Object.keys(set).length > 0) {
      try {
        await this.repo.updatePatente(id, set);
      } catch (err) {
        if (esE11000(err)) {
          throw AppError.unique("Ya existe una patente con ese numero de patente.");
        }
        throw err;
      }
    }
    const updated = await this.repo.findPatenteById(id);
    if (!updated) throw AppError.notFound("Patente no encontrada.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.update",
      "patente",
      id,
      JSON.stringify({ campos: Object.keys(set) }),
    );
    return this.toPatenteDto(updated);
  }

  async deletePatente(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findPatenteById(id);
    if (!existing) throw AppError.notFound("Patente no encontrada.");
    // Permiso: delete es RecursosManage-only (doc 07 §2.1).
    // El controller ya aplica el guard RecursosManage; aqui no se revalida.
    await this.withTransaction(async (session) => {
      await this.repo.setPatenteActivo(id, 0, session);
      await this.repo.deletePatenteInventoresByPatente(id, session);
      await this.repo.deletePatenteTitularesByPatente(id, session);
      await this.repo.deleteEntityOcdeFieldsByPatente(id, session);
    });
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.delete",
      "patente",
      id,
    );
  }

  async reactivatePatente(id: string, actor: AuthenticatedUser): Promise<PatenteDto> {
    const existing = await this.repo.findPatenteById(id);
    if (!existing) throw AppError.notFound("Patente no encontrada.");
    await this.repo.setPatenteActivo(id, 1);
    const updated = await this.repo.findPatenteById(id);
    if (!updated) throw AppError.notFound("Patente no encontrada.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.reactivate",
      "patente",
      id,
    );
    return this.toPatenteDto(updated);
  }

  async listPatentesByProyecto(idProyecto: string): Promise<PatenteDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const docs = await this.repo.listPatentesByProyecto(idProyecto);
    return docs.map((d) => this.toPatenteDto(d));
  }

  // ============================================================
  // EQUIPAMIENTOS
  // ============================================================
  //
  // Nota D2 (doc 07 §5 + plan Bloque E): el spec Rust permite a
  // responsable_proyecto crear/actualizar equipamiento, pero la guia de
  // plan dice que equipamiento NO expone `proyectoId` en el body (D10 lo
  // elimino del modelo). Para que el helper RBAC cumpla D2 (bypass Rust
  // CERRADO), equipamiento create/update requiere o (a) RecursosManage o
  // (b) responsable_proyecto con un proyectoId verificable. Como el body
  // no expone proyectoId, equipamiento create/update se expone solo a
  // RecursosManage (el controller aplica `RequirePermission(RecursosManage)`).
  // responsable_proyecto puede crear equipamiento indirectamente via flujo
  // de financiamientos del proyecto (que si expone el helper completo).

  async createEquipamiento(
    input: CreateEquipamientoDto,
    actor: AuthenticatedUser,
  ): Promise<EquipamientoDto> {
    const nombre = this.trimOrFail(input.nombre, "El nombre del equipamiento es obligatorio.");
    if (nombre.length === 0) {
      throw AppError.validation("El nombre del equipamiento es obligatorio.");
    }
    const moneda = validarMonedaODefault(input.moneda ?? null);
    const valor = validarMontoFinito(input.valorEstimado ?? null);

    if (input.idOrgUnitPropietaria) {
      await this.ensureEntityExists("org_units", input.idOrgUnitPropietaria, "Unidad organizativa");
    }
    if (input.idFinanciamiento) {
      await this.ensureEntityExists("financiamientos", input.idFinanciamiento, "Financiamiento");
    }
    if (input.codigoInstitucional) {
      const dup = await this.repo.findEquipamientoByCodigo(input.codigoInstitucional);
      if (dup) {
        throw AppError.unique("Ya existe un equipamiento con ese codigo institucional.");
      }
    }

    const now = Date.now();
    const id_equipamiento = randomUUID();
    const doc = {
      id_equipamiento,
      nombre,
      descripcion: this.trimOrNull(input.descripcion),
      especificaciones: this.trimOrNull(input.especificaciones),
      proveedor: this.trimOrNull(input.proveedor),
      moneda,
      valor_estimado: valor,
      fecha_adquisicion: input.fechaAdquisicion ?? null,
      codigo_institucional: this.trimOrNull(input.codigoInstitucional),
      tipo_equipamiento: this.trimOrNull(input.tipoEquipamiento),
      uso_equipamiento: this.trimOrNull(input.usoEquipamiento),
      id_org_unit_propietaria: this.trimOrNull(input.idOrgUnitPropietaria),
      id_financiamiento: this.trimOrNull(input.idFinanciamiento),
      created_at: now,
      updated_at: now,
      activo: 1,
    };
    try {
      await this.repo.insertEquipamiento(doc);
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("Ya existe un equipamiento con ese codigo institucional.");
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "equipamiento.create",
      "equipamiento",
      id_equipamiento,
      JSON.stringify({ nombre, id_financiamiento: doc.id_financiamiento }),
    );
    return this.toEquipamientoDto(doc);
  }

  async updateEquipamiento(
    id: string,
    input: UpdateEquipamientoDto,
    actor: AuthenticatedUser,
  ): Promise<EquipamientoDto> {
    const existing = await this.repo.findEquipamientoById(id);
    if (!existing) throw AppError.notFound("Equipamiento no encontrado.");
    void actor;
    const set: Partial<EquipamientoDocLocal> = {};
    if (input.nombre !== undefined) {
      const n = this.trimOrFail(input.nombre, "El nombre del equipamiento es obligatorio.");
      if (n.length === 0) throw AppError.validation("El nombre del equipamiento es obligatorio.");
      if (n !== existing.nombre) set.nombre = n;
    }
    if (input.moneda !== undefined) {
      const m = validarMonedaODefault(input.moneda);
      if (m !== existing.moneda) set.moneda = m;
    }
    if (input.valorEstimado !== undefined) {
      const v = validarMontoFinito(input.valorEstimado);
      if (v !== existing.valor_estimado) set.valor_estimado = v;
    }
    if (input.idOrgUnitPropietaria) {
      await this.ensureEntityExists("org_units", input.idOrgUnitPropietaria, "Unidad organizativa");
      set.id_org_unit_propietaria = this.trimOrNull(input.idOrgUnitPropietaria);
    } else if (input.idOrgUnitPropietaria === null) {
      set.id_org_unit_propietaria = null;
    }
    if (input.idFinanciamiento) {
      await this.ensureEntityExists("financiamientos", input.idFinanciamiento, "Financiamiento");
      set.id_financiamiento = this.trimOrNull(input.idFinanciamiento);
    } else if (input.idFinanciamiento === null) {
      set.id_financiamiento = null;
    }
    if (input.codigoInstitucional !== undefined) {
      const cod = this.trimOrNull(input.codigoInstitucional);
      if (cod !== existing.codigo_institucional) {
        if (cod) {
          const dup = await this.repo.findEquipamientoByCodigo(cod);
          if (dup) throw AppError.unique("Ya existe un equipamiento con ese codigo institucional.");
        }
        set.codigo_institucional = cod;
      }
    }
    const descripcion = input.descripcion !== undefined ? this.trimOrNull(input.descripcion) : undefined;
    if (descripcion !== undefined && descripcion !== existing.descripcion) set.descripcion = descripcion;
    const especificaciones = input.especificaciones !== undefined ? this.trimOrNull(input.especificaciones) : undefined;
    if (especificaciones !== undefined && especificaciones !== existing.especificaciones) set.especificaciones = especificaciones;
    const proveedor = input.proveedor !== undefined ? this.trimOrNull(input.proveedor) : undefined;
    if (proveedor !== undefined && proveedor !== existing.proveedor) set.proveedor = proveedor;
    if (input.fechaAdquisicion !== undefined && input.fechaAdquisicion !== existing.fecha_adquisicion) {
      set.fecha_adquisicion = input.fechaAdquisicion;
    }
    const tipoEq = input.tipoEquipamiento !== undefined ? this.trimOrNull(input.tipoEquipamiento) : undefined;
    if (tipoEq !== undefined && tipoEq !== existing.tipo_equipamiento) set.tipo_equipamiento = tipoEq;
    const usoEq = input.usoEquipamiento !== undefined ? this.trimOrNull(input.usoEquipamiento) : undefined;
    if (usoEq !== undefined && usoEq !== existing.uso_equipamiento) set.uso_equipamiento = usoEq;

    if (Object.keys(set).length > 0) {
      try {
        await this.repo.updateEquipamiento(id, set);
      } catch (err) {
        if (esE11000(err)) {
          throw AppError.unique("Ya existe un equipamiento con ese codigo institucional.");
        }
        throw err;
      }
    }
    const updated = await this.repo.findEquipamientoById(id);
    if (!updated) throw AppError.notFound("Equipamiento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "equipamiento.update",
      "equipamiento",
      id,
      JSON.stringify({ campos: Object.keys(set) }),
    );
    return this.toEquipamientoDto(updated);
  }

  async deleteEquipamiento(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findEquipamientoById(id);
    if (!existing) throw AppError.notFound("Equipamiento no encontrado.");
    await this.repo.setEquipamientoActivo(id, 0);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "equipamiento.delete",
      "equipamiento",
      id,
    );
  }

  async reactivateEquipamiento(id: string, actor: AuthenticatedUser): Promise<EquipamientoDto> {
    const existing = await this.repo.findEquipamientoById(id);
    if (!existing) throw AppError.notFound("Equipamiento no encontrado.");
    await this.repo.setEquipamientoActivo(id, 1);
    const updated = await this.repo.findEquipamientoById(id);
    if (!updated) throw AppError.notFound("Equipamiento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "equipamiento.reactivate",
      "equipamiento",
      id,
    );
    return this.toEquipamientoDto(updated);
  }

  /**
   * D4 (doc 07 §5): `GET /proyectos/:id/equipamientos` resuelve de verdad
   * via pivots. Cadena: `proyecto_financiamientos` (del proyecto) →
   * `id_financiamiento` → `equipamientos` (por `id_financiamiento`).
   */
  async listEquipamientosByProyecto(idProyecto: string): Promise<EquipamientoDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const finIds = await this.repo.listFinanciamientoIdsByProyecto(idProyecto);
    const docs = await this.repo.listEquipamientosByFinanciamientos(finIds);
    return docs.map((d) => this.toEquipamientoDto(d));
  }

  // ============================================================
  // FINANCIAMIENTOS
  // ============================================================

  async createFinanciamiento(
    input: CreateFinanciamientoDto,
    actor: AuthenticatedUser,
  ): Promise<FinanciamientoDto> {
    const codigo = this.trimOrFail(input.codigo, "El codigo del financiamiento es obligatorio.");
    if (codigo.length === 0) {
      throw AppError.validation("El codigo del financiamiento es obligatorio.");
    }
    if (codigo.length > MAX_CODIGO_LENGTH) {
      throw AppError.validation(`El codigo no debe exceder ${MAX_CODIGO_LENGTH} caracteres.`);
    }
    const moneda = validarMonedaODefault(input.moneda ?? null);
    const monto = validarMontoFinito(input.monto ?? null);
    validarFechasFinanciamiento(input.fechaInicio ?? null, input.fechaFin ?? null);

    if (input.idOrgUnitFinanciadora) {
      await this.ensureEntityExists("org_units", input.idOrgUnitFinanciadora, "Unidad organizativa");
    }
    if (input.parentId) {
      await this.ensureEntityExists("financiamientos", input.parentId, "Financiamiento padre");
    }

    const now = Date.now();
    const id_financiamiento = randomUUID();
    const doc = {
      id_financiamiento,
      codigo,
      nombre: this.trimOrNull(input.nombre),
      modalidad: this.trimOrNull(input.modalidad),
      id_org_unit_financiadora: this.trimOrNull(input.idOrgUnitFinanciadora),
      parent_id: this.trimOrNull(input.parentId),
      tipo: this.trimOrNull(input.tipo),
      monto,
      moneda,
      fecha_inicio: input.fechaInicio ?? null,
      fecha_fin: input.fechaFin ?? null,
      descripcion: this.trimOrNull(input.descripcion),
      estado_financiero: this.trimOrNull(input.estadoFinanciero),
      created_at: now,
      updated_at: now,
      activo: 1,
    };
    await this.repo.insertFinanciamiento(doc);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "financiamiento.create",
      "financiamiento",
      id_financiamiento,
      JSON.stringify({ codigo }),
    );
    return this.toFinanciamientoDto(doc);
  }

  async updateFinanciamiento(
    id: string,
    input: UpdateFinanciamientoDto,
    actor: AuthenticatedUser,
  ): Promise<FinanciamientoDto> {
    const existing = await this.repo.findFinanciamientoById(id);
    if (!existing) throw AppError.notFound("Financiamiento no encontrado.");

    const set: Partial<FinanciamientoDocLocal> = {};
    if (input.codigo !== undefined) {
      const c = this.trimOrFail(input.codigo, "El codigo del financiamiento es obligatorio.");
      if (c.length === 0) throw AppError.validation("El codigo del financiamiento es obligatorio.");
      if (c.length > MAX_CODIGO_LENGTH) {
        throw AppError.validation(`El codigo no debe exceder ${MAX_CODIGO_LENGTH} caracteres.`);
      }
      if (c !== existing.codigo) set.codigo = c;
    }
    if (input.moneda !== undefined) {
      const m = validarMonedaODefault(input.moneda);
      if (m !== existing.moneda) set.moneda = m;
    }
    if (input.monto !== undefined) {
      const v = validarMontoFinito(input.monto);
      if (v !== existing.monto) set.monto = v;
    }
    const fechaInicio = input.fechaInicio !== undefined ? input.fechaInicio : existing.fecha_inicio;
    const fechaFin = input.fechaFin !== undefined ? input.fechaFin : existing.fecha_fin;
    validarFechasFinanciamiento(fechaInicio, fechaFin);
    if (input.fechaInicio !== undefined && input.fechaInicio !== existing.fecha_inicio) {
      set.fecha_inicio = input.fechaInicio;
    }
    if (input.fechaFin !== undefined && input.fechaFin !== existing.fecha_fin) {
      set.fecha_fin = input.fechaFin;
    }
    if (input.idOrgUnitFinanciadora) {
      await this.ensureEntityExists("org_units", input.idOrgUnitFinanciadora, "Unidad organizativa");
      set.id_org_unit_financiadora = this.trimOrNull(input.idOrgUnitFinanciadora);
    } else if (input.idOrgUnitFinanciadora === null) {
      set.id_org_unit_financiadora = null;
    }
    if (input.parentId) {
      validarFinanciamientoNoSelfParent(id, input.parentId);
      await this.ensureEntityExists("financiamientos", input.parentId, "Financiamiento padre");
      set.parent_id = this.trimOrNull(input.parentId);
    } else if (input.parentId === null) {
      set.parent_id = null;
    }
    const nombre = input.nombre !== undefined ? this.trimOrNull(input.nombre) : undefined;
    if (nombre !== undefined && nombre !== existing.nombre) set.nombre = nombre;
    const modalidad = input.modalidad !== undefined ? this.trimOrNull(input.modalidad) : undefined;
    if (modalidad !== undefined && modalidad !== existing.modalidad) set.modalidad = modalidad;
    const tipo = input.tipo !== undefined ? this.trimOrNull(input.tipo) : undefined;
    if (tipo !== undefined && tipo !== existing.tipo) set.tipo = tipo;
    const descripcion = input.descripcion !== undefined ? this.trimOrNull(input.descripcion) : undefined;
    if (descripcion !== undefined && descripcion !== existing.descripcion) set.descripcion = descripcion;
    const estadoFin = input.estadoFinanciero !== undefined ? this.trimOrNull(input.estadoFinanciero) : undefined;
    if (estadoFin !== undefined && estadoFin !== existing.estado_financiero) set.estado_financiero = estadoFin;

    if (Object.keys(set).length > 0) {
      await this.repo.updateFinanciamiento(id, set);
    }
    const updated = await this.repo.findFinanciamientoById(id);
    if (!updated) throw AppError.notFound("Financiamiento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "financiamiento.update",
      "financiamiento",
      id,
      JSON.stringify({ campos: Object.keys(set) }),
    );
    return this.toFinanciamientoDto(updated);
  }

  async deleteFinanciamiento(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findFinanciamientoById(id);
    if (!existing) throw AppError.notFound("Financiamiento no encontrado.");
    await this.repo.setFinanciamientoActivo(id, 0);
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "financiamiento.delete",
      "financiamiento",
      id,
    );
  }

  async reactivateFinanciamiento(id: string, actor: AuthenticatedUser): Promise<FinanciamientoDto> {
    const existing = await this.repo.findFinanciamientoById(id);
    if (!existing) throw AppError.notFound("Financiamiento no encontrado.");
    await this.repo.setFinanciamientoActivo(id, 1);
    const updated = await this.repo.findFinanciamientoById(id);
    if (!updated) throw AppError.notFound("Financiamiento no encontrado.");
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "financiamiento.reactivate",
      "financiamiento",
      id,
    );
    return this.toFinanciamientoDto(updated);
  }

  /**
   * D4 (doc 07 §5): `GET /proyectos/:id/financiamientos-recursos` resuelve
   * via pivots `proyecto_financiamientos`. Devuelve los financiamientos
   * ACTIVOS del proyecto, no los legacy (Rust filtraba proyecto_id muerto
   * desde D10 → siempre vacio).
   */
  async listFinanciamientosByProyecto(idProyecto: string): Promise<FinanciamientoDto[]> {
    await this.repo.ensureProyectoExists(idProyecto);
    const finIds = await this.repo.listFinanciamientoIdsByProyecto(idProyecto);
    const docs = await this.repo.listFinanciamientosByIds(finIds);
    return docs.map((d) => this.toFinanciamientoDto(d));
  }

  // ============================================================
  // PIVOTS: INVENTORES
  // ============================================================

  async attachInventor(
    idPatente: string,
    dto: VincularInventorDto,
    actor: AuthenticatedUser,
  ): Promise<PatenteInventorDto> {
    const patente = await this.repo.findPatenteById(idPatente);
    if (!patente) throw AppError.notFound("Patente no encontrada.");
    await this.assertManageOrResponsableForPatente(actor, patente.proyecto_id);

    const orden = validarOrdenPivot(dto.orden);
    await this.ensureEntityExists("personas", dto.idPersona, "Persona");

    const id = randomUUID();
    try {
      await this.repo.insertPatenteInventor({
        _id: id,
        id_patente: idPatente,
        id_persona: dto.idPersona,
        orden,
      });
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("El inventor ya esta vinculado a esta patente.");
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.vincular_inventor",
      "patente_inventor",
      id,
      JSON.stringify({ id_patente: idPatente, id_persona: dto.idPersona, orden }),
    );
    return { id, id_patente: idPatente, id_persona: dto.idPersona, orden };
  }

  async detachInventor(
    idPatente: string,
    idPivot: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const deleted = await this.repo.deletePatenteInventorById(idPivot, idPatente);
    if (deleted === 0) {
      throw AppError.notFound("Vinculo inventor-patente no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.desvincular_inventor",
      "patente_inventor",
      idPivot,
    );
  }

  async listInventores(idPatente: string): Promise<PatenteInventorDocLocal[]> {
    await this.repo.ensurePatenteExists(idPatente);
    const docs = await this.repo.listPatenteInventoresByPatente(idPatente);
    return docs.map((d) => ({
      id: d._id,
      id_patente: d.id_patente,
      id_persona: d.id_persona,
      orden: d.orden,
    }));
  }

  // ============================================================
  // PIVOTS: TITULARES
  // ============================================================

  async attachTitular(
    idPatente: string,
    dto: VincularTitularDto,
    actor: AuthenticatedUser,
  ): Promise<PatenteTitularDto> {
    const patente = await this.repo.findPatenteById(idPatente);
    if (!patente) throw AppError.notFound("Patente no encontrada.");
    await this.assertManageOrResponsableForPatente(actor, patente.proyecto_id);

    const orden = validarOrdenPivot(dto.orden);
    validarTitularHolderExactlyOne(
      dto.holderType,
      dto.idOrgUnit,
      dto.idPersona,
    );
    const idOrgUnit = this.trimOrNull(dto.idOrgUnit);
    const idPersona = this.trimOrNull(dto.idPersona);
    if (idOrgUnit) {
      await this.ensureEntityExists("org_units", idOrgUnit, "Unidad organizativa");
    }
    if (idPersona) {
      await this.ensureEntityExists("personas", idPersona, "Persona");
    }

    const id = randomUUID();
    try {
      await this.repo.insertPatenteTitular({
        _id: id,
        id_patente: idPatente,
        holder_type: dto.holderType,
        id_org_unit: idOrgUnit,
        id_persona: idPersona,
        orden,
      });
    } catch (err) {
      if (esE11000(err)) {
        throw AppError.unique("El titular ya esta vinculado a esta patente.");
      }
      throw err;
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.vincular_titular",
      "patente_titular",
      id,
      JSON.stringify({
        id_patente: idPatente,
        holder_type: dto.holderType,
        orden,
      }),
    );
    return {
      id,
      id_patente: idPatente,
      holder_type: dto.holderType,
      id_org_unit: idOrgUnit,
      id_persona: idPersona,
      orden,
    };
  }

  async detachTitular(
    idPatente: string,
    idPivot: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const deleted = await this.repo.deletePatenteTitularById(idPivot, idPatente);
    if (deleted === 0) {
      throw AppError.notFound("Vinculo titular-patente no encontrado.");
    }
    await this.audit.writeGenericAudit(
      this.toAuditActor(actor),
      "patente.desvincular_titular",
      "patente_titular",
      idPivot,
    );
  }

  async listTitulares(idPatente: string): Promise<PatenteTitularDocLocal[]> {
    await this.repo.ensurePatenteExists(idPatente);
    const docs = await this.repo.listPatenteTitularesByPatente(idPatente);
    return docs.map((d) => ({
      id: d._id,
      id_patente: d.id_patente,
      holder_type: d.holder_type,
      id_org_unit: d.id_org_unit,
      id_persona: d.id_persona,
      orden: d.orden,
    }));
  }

  // ============================================================
  // Privados
  // ============================================================

  private async assertManageOrResponsable(
    actor: AuthenticatedUser,
    proyectoId: string | null,
  ): Promise<void> {
    await requireRecursosManageOrResponsable(
      actor,
      proyectoId,
      this.buildRbacDeps(),
    );
  }

  private async assertManageOrResponsableForPatente(
    actor: AuthenticatedUser,
    proyectoId: string | null,
  ): Promise<void> {
    await requireRecursosManageOrResponsableForPatente(
      actor,
      proyectoId,
      this.buildRbacDeps(),
    );
  }

  private buildRbacDeps(): RecursosRbacDeps {
    const repo = this.repo;
    const usuariosRepo = this.usuariosRepo;
    const investigadoresRepo = this.investigadoresRepo;
    return {
      async esResponsableDelProyecto(
        idInvestigador: string,
        idProyecto: string,
      ): Promise<boolean> {
        const count = await repo.countParticipacionesResponsable(
          idProyecto,
          idInvestigador,
        );
        return count > 0;
      },
      async resolverInvestigadorIdDelActor(
        actor: RecursosRbacActor,
      ): Promise<string | null> {
        const usuario = await usuariosRepo.findById(actor.id_usuario);
        if (!usuario?.dni) return null;
        const investigador = await investigadoresRepo.findByDni(usuario.dni);
        return investigador?.id_investigador ?? null;
      },
    };
  }

  private async ensureEntityExists(
    collection: string,
    id: string,
    label: string,
  ): Promise<void> {
    const ok = await this.repo.entityExists(collection, id);
    if (!ok) {
      throw AppError.notFound(`${label} no encontrado.`);
    }
  }

  private toPatenteDto(doc: { id_patente: string; proyecto_id: string | null; titulo: string; numero_patente: string | null; tipo: string | null; estado: string | null; fecha_solicitud: number | null; fecha_concesion: number | null; pais: string | null; entidad_concedente: string | null; descripcion: string | null; clasificacion_ipc: string | null; id_org_unit_concedente: string | null; created_at: number | null; updated_at: number | null; activo: number }): PatenteDto {
    return {
      id_patente: doc.id_patente,
      proyecto_id: doc.proyecto_id,
      titulo: doc.titulo,
      numero_patente: doc.numero_patente,
      tipo: doc.tipo,
      estado: doc.estado,
      fecha_solicitud: doc.fecha_solicitud,
      fecha_concesion: doc.fecha_concesion,
      pais: doc.pais,
      entidad_concedente: doc.entidad_concedente,
      descripcion: doc.descripcion,
      clasificacion_ipc: doc.clasificacion_ipc,
      id_org_unit_concedente: doc.id_org_unit_concedente,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      activo: doc.activo === 1,
    };
  }

  private toEquipamientoDto(doc: { id_equipamiento: string; nombre: string; descripcion: string | null; especificaciones: string | null; proveedor: string | null; moneda: string | null; valor_estimado: number | null; fecha_adquisicion: number | null; codigo_institucional: string | null; tipo_equipamiento: string | null; uso_equipamiento: string | null; id_org_unit_propietaria: string | null; id_financiamiento: string | null; created_at: number | null; updated_at: number | null; activo: number }): EquipamientoDto {
    return {
      id_equipamiento: doc.id_equipamiento,
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      especificaciones: doc.especificaciones,
      proveedor: doc.proveedor,
      moneda: doc.moneda,
      valor_estimado: doc.valor_estimado,
      fecha_adquisicion: doc.fecha_adquisicion,
      codigo_institucional: doc.codigo_institucional,
      tipo_equipamiento: doc.tipo_equipamiento,
      uso_equipamiento: doc.uso_equipamiento,
      id_org_unit_propietaria: doc.id_org_unit_propietaria,
      id_financiamiento: doc.id_financiamiento,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      activo: doc.activo === 1,
    };
  }

  private toFinanciamientoDto(doc: { id_financiamiento: string; codigo: string; nombre: string | null; modalidad: string | null; id_org_unit_financiadora: string | null; parent_id: string | null; tipo: string | null; monto: number | null; moneda: string | null; fecha_inicio: number | null; fecha_fin: number | null; descripcion: string | null; estado_financiero: string | null; created_at: number | null; updated_at: number | null; activo: number }): FinanciamientoDto {
    return {
      id_financiamiento: doc.id_financiamiento,
      codigo: doc.codigo,
      nombre: doc.nombre,
      modalidad: doc.modalidad,
      id_org_unit_financiadora: doc.id_org_unit_financiadora,
      parent_id: doc.parent_id,
      tipo: doc.tipo,
      monto: doc.monto,
      moneda: doc.moneda,
      fecha_inicio: doc.fecha_inicio,
      fecha_fin: doc.fecha_fin,
      descripcion: doc.descripcion,
      estado_financiero: doc.estado_financiero,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      activo: doc.activo === 1,
    };
  }

  private toAuditActor(actor: AuthenticatedUser): {
    id_usuario: string;
    username: string;
    rol: string;
  } {
    return {
      id_usuario: actor.id_usuario,
      username: actor.username,
      rol: actor.rol,
    };
  }

  private trimOrNull(s: string | null | undefined): string | null {
    if (s == null) return null;
    const t = s.trim();
    return t.length === 0 ? null : t;
  }

  private trimOrFail(s: string | null | undefined, msg: string): string {
    if (s == null) throw AppError.validation(msg);
    return s.trim();
  }

  private async withTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = this.client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}

// ============================================================
// tipos locales para `set` de update (no exportados)
// ============================================================

interface PatenteDocLocal {
  proyecto_id: string | null;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  descripcion: string | null;
  clasificacion_ipc: string | null;
  id_org_unit_concedente: string | null;
}

interface EquipamientoDocLocal {
  nombre: string;
  descripcion: string | null;
  especificaciones: string | null;
  proveedor: string | null;
  moneda: string | null;
  valor_estimado: number | null;
  fecha_adquisicion: number | null;
  codigo_institucional: string | null;
  tipo_equipamiento: string | null;
  uso_equipamiento: string | null;
  id_org_unit_propietaria: string | null;
  id_financiamiento: string | null;
}

interface FinanciamientoDocLocal {
  codigo: string;
  nombre: string | null;
  modalidad: string | null;
  id_org_unit_financiadora: string | null;
  parent_id: string | null;
  tipo: string | null;
  monto: number | null;
  moneda: string | null;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  descripcion: string | null;
  estado_financiero: string | null;
}

interface PatenteInventorDocLocal {
  id: string;
  id_patente: string;
  id_persona: string;
  orden: number;
}

interface PatenteTitularDocLocal {
  id: string;
  id_patente: string;
  holder_type: "ORG_UNIT" | "PERSON";
  id_org_unit: string | null;
  id_persona: string | null;
  orden: number;
}

function esE11000(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}
