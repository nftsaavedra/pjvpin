import { invoke } from "./client";
import type { ReniecDniLookupResult } from "./types";

export interface ConnectivityResult {
  service: string;
  success: boolean;
  message: string;
}

export interface WizardConfigRequest {
  masterPassword: string;
  mongodbUri: string;
  mongodbDb?: string;
  reniecToken?: string;
  renacytBaseUrl?: string;
  renacytActoVersion?: string;
  pureApiKey?: string;
}

export const wizardHasConfig = async (): Promise<boolean> => {
  return await invoke("wizard_has_config");
};

export const wizardTestMongo = async (uri: string): Promise<ConnectivityResult> => {
  return await invoke("wizard_test_mongodb", { uri });
};

export const wizardTestReniec = async (token: string): Promise<ConnectivityResult> => {
  return await invoke("wizard_test_reniec", { token });
};

export const wizardTestRenacyt = async (baseUrl: string): Promise<ConnectivityResult> => {
  return await invoke("wizard_test_renacyt", { baseUrl });
};

export const wizardTestPure = async (
  baseUrl: string,
  apiKey: string,
): Promise<ConnectivityResult> => {
  return await invoke("wizard_test_pure", { baseUrl, apiKey });
};

export const wizardSaveConfig = async (request: WizardConfigRequest): Promise<void> => {
  await invoke("wizard_save_config", { request });
};

export const wizardValidateMasterPassword = async (password: string): Promise<void> => {
  await invoke("wizard_validate_master_password", { password });
};

export const wizardConsultarDni = async (
  token: string,
  numero: string,
): Promise<ReniecDniLookupResult> => {
  return await invoke("wizard_consultar_dni", { token, numero });
};
