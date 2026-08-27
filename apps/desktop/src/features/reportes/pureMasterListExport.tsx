/**
 * Renderizador Excel para el Master List de Pure (Persons +
 * StaffOrganisationRelations).
 *
 * Contrato estricto (alineamiento Fase 4): el frontend SOLO formatea a
 * Excel. Todos los datos vienen del backend Rust
 * (`reportes::repository_pure_masterlist` -> `PureMasterlistData`). No se
 * recalculan conteos ni se transforman campos.
 *
 * `pureRemoteTotal` es el conteo de personas en Pure remoto que ya viene
 * del backend; no se vuelve a contar en el frontend.
 */

import ExcelJS from "exceljs";
import type {
  PureMasterlistData,
  PureMasterlistPersonRow,
  PureMasterlistStaffRow,
} from "@/shared/tauri/types";
import { getDataPureMasterlist } from "@/shared/tauri/reportes";

interface PureMasterListPayload {
  bytes: Uint8Array;
  suggestedName: string;
}

// Headers EXACTOS de la plantilla Pure Master List V8 (case-sensitive).
// Las dos hojas generadas son `Persons` y `Stafforganisationrelations`.
// Single source: cualquier ajuste de la plantilla se hace aqui.
const PERSONS_COLUMNS = [
  "PersonID",
  "Profiled",
  "Username",
  "Email",
  "Title",
  "Title_translated",
  "PostNominals",
  "Firstname",
  "Lastname",
  "Firstname_translated",
  "Lastname_translated",
  "FirstNameKnownAs",
  "LastNameKnownAs",
  "FirstNameSorting",
  "LastNameSorting",
  "FormerLastName",
  "PriorAffiliations",
  "Nationality",
  "Gender",
  "Visibility",
  "ORCID",
  "ProfilePhoto",
  "ClientID_1",
  "ClientID_2",
  "ClientID_3",
  "ExternallyAuthenticated",
] as const;

const STAFF_RELATIONS_COLUMNS = [
  "PersonID",
  "OrganisationID",
  "ContractType",
  "JobTitle",
  "JobDescription",
  "JobDescription_translated",
  "EmployedAs",
  "FTE",
  "StartDate",
  "EndDate",
  "DirectPhoneNr",
  "MobilePhoneNr",
  "FaxNr",
  "Email",
  "WebsiteURL_en",
  "WebsiteURL_translated",
  "Primary",
  "StaffType",
] as const;

type PersonCellKey = keyof PureMasterlistPersonRow;
type StaffCellKey = keyof PureMasterlistStaffRow;

// Mapa de header V8 -> propiedad camelCase del DTO. `null` = columna
// intencionalmente vacia en esta fila (no existe mapeo en BD).
const PERSON_KEY_MAP: Record<(typeof PERSONS_COLUMNS)[number], PersonCellKey | null> = {
  PersonID: "personId",
  Profiled: "profiled",
  Username: "username",
  Email: "email",
  Title: null,
  Title_translated: null,
  PostNominals: null,
  Firstname: "firstname",
  Lastname: "lastname",
  Firstname_translated: null,
  Lastname_translated: null,
  FirstNameKnownAs: null,
  LastNameKnownAs: null,
  FirstNameSorting: null,
  LastNameSorting: null,
  FormerLastName: null,
  PriorAffiliations: null,
  Nationality: null,
  Gender: "gender",
  Visibility: "visibility",
  ORCID: "orcid",
  ProfilePhoto: null,
  ClientID_1: null,
  ClientID_2: "clientId2",
  ClientID_3: "clientId3",
  ExternallyAuthenticated: "externallyAuthenticated",
};

const STAFF_KEY_MAP: Record<(typeof STAFF_RELATIONS_COLUMNS)[number], StaffCellKey | null> = {
  PersonID: "personId",
  OrganisationID: "organisationId",
  ContractType: null,
  JobTitle: null,
  JobDescription: null,
  JobDescription_translated: null,
  EmployedAs: "employedAs",
  FTE: null,
  StartDate: "startDate",
  EndDate: null,
  DirectPhoneNr: null,
  MobilePhoneNr: null,
  FaxNr: null,
  Email: "email",
  WebsiteURL_en: null,
  WebsiteURL_translated: null,
  Primary: "primary",
  StaffType: "staffType",
};

const cellValue = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const buildPersonCells = (row: PureMasterlistPersonRow): (string | null)[] =>
  PERSONS_COLUMNS.map((col) => {
    const key = PERSON_KEY_MAP[col];
    if (!key) return null;
    return cellValue(row[key]);
  });

const buildStaffCells = (row: PureMasterlistStaffRow): (string | null)[] =>
  STAFF_RELATIONS_COLUMNS.map((col) => {
    const key = STAFF_KEY_MAP[col];
    if (!key) return null;
    return cellValue(row[key]);
  });

export const buildPureMasterListExcel = async (
  pureRemoteTotal?: number,
): Promise<PureMasterListPayload> => {
  const data = await getDataPureMasterlist(pureRemoteTotal);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PJVPIN";
  workbook.created = new Date();

  const personsWs = workbook.addWorksheet("Persons");
  personsWs.columns = PERSONS_COLUMNS.map((header) => ({
    header,
    key: header,
    width: 22,
  }));
  for (const p of data.persons) {
    personsWs.addRow(buildPersonCells(p));
  }

  const staffWs = workbook.addWorksheet("Stafforganisationrelations");
  staffWs.columns = STAFF_RELATIONS_COLUMNS.map((header) => ({
    header,
    key: header,
    width: 22,
  }));
  for (const s of data.staffRelations) {
    staffWs.addRow(buildStaffCells(s));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().split("T")[0];
  return {
    bytes: new Uint8Array(buffer),
    suggestedName: `pure-masterlist-unf-${date}.xlsx`,
  };
};

export const fetchPureMasterListPreview = async (
  pureRemoteTotal?: number,
): Promise<PureMasterlistData> => getDataPureMasterlist(pureRemoteTotal);
