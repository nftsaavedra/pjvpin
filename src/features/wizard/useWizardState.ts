import { useCallback, useState } from 'react';
import type { WizardConfigRequest } from '@/services/tauri/wizard';

export interface WizardState {
  step: number;
  masterPassword: string;
  mongodbUri: string;
  mongodbDb: string;
  reniecToken: string;
  renacytBaseUrl: string;
  renacytActoVersion: string;
  pureApiKey: string;
  results: Record<string, boolean>;
}

const initialState: WizardState = {
  step: 1,
  masterPassword: '',
  mongodbUri: '',
  mongodbDb: 'pjupi',
  reniecToken: '',
  renacytBaseUrl: 'https://renacyt.concytec.gob.pe/renacyt-backend',
  renacytActoVersion: '2021',
  pureApiKey: '',
  results: {},
};

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState);

  const update = useCallback((key: keyof WizardState, value: string | number | Record<string, boolean>) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  const buildRequest = (): WizardConfigRequest => ({
    masterPassword: state.masterPassword,
    mongodbUri: state.mongodbUri,
    mongodbDb: state.mongodbDb || undefined,
    reniecToken: state.reniecToken || undefined,
    renacytBaseUrl: state.renacytBaseUrl || undefined,
    renacytActoVersion: state.renacytActoVersion || undefined,
    pureApiKey: state.pureApiKey || undefined,
  });

  return { state, update, nextStep, prevStep, buildRequest };
}
