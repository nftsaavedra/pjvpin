export interface PureMasterlistPersonRow {
  personId: string;
  profiled: string;
  username?: string | null;
  email?: string | null;
  title?: string | null;
  titleTranslated?: string | null;
  postNominals?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  firstnameTranslated?: string | null;
  lastnameTranslated?: string | null;
  firstNameKnownAs?: string | null;
  lastNameKnownAs?: string | null;
  firstNameSorting?: string | null;
  lastNameSorting?: string | null;
  formerLastName?: string | null;
  priorAffiliations?: string | null;
  nationality?: string | null;
  gender: string;
  visibility: string;
  orcid?: string | null;
  profilePhoto?: string | null;
  clientId1?: string | null;
  clientId2?: string | null;
  clientId3?: string | null;
  externallyAuthenticated: string;
}

export interface PureMasterlistStaffRow {
  personId: string;
  organisationId: string;
  contractType?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  jobDescriptionTranslated?: string | null;
  employedAs: string;
  fte?: string | null;
  startDate: string;
  endDate?: string | null;
  directPhoneNr?: string | null;
  mobilePhoneNr?: string | null;
  faxNr?: string | null;
  email?: string | null;
  websiteUrlEn?: string | null;
  websiteUrlTranslated?: string | null;
  primary: string;
  staffType: string;
}

export interface PureMasterlistSummary {
  total: number;
  actualizacionesPure: number;
  altasNuevas: number;
  sinCorreo: number;
  sinOrcid: number;
  pureRemotoTotal: number;
}

export interface PureMasterlistData {
  persons: PureMasterlistPersonRow[];
  staffRelations: PureMasterlistStaffRow[];
  summary: PureMasterlistSummary;
}

export interface SyncPurePersonIdsResult {
  totalPure: number;
  matched: number;
  assigned: number;
  unmatchedDnis: string[];
}
