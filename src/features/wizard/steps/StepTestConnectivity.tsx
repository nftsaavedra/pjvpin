import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, Wifi, XCircle } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import {
  wizardTestMongo,
  wizardTestReniec,
  wizardTestRenacyt,
  wizardTestPure,
  type ConnectivityResult,
} from '@/services/tauri/wizard';
import type { WizardState } from '../useWizardState';

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

type TestStatus = 'idle' | 'running' | 'ok' | 'fail';

interface TestEntry {
  label: string;
  status: TestStatus;
  message: string;
}

export const StepTestConnectivity: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const [tests, setTests] = useState<TestEntry[]>(() => [
    { label: 'MongoDB', status: 'idle', message: '' },
    { label: 'RENIEC', status: 'idle', message: '' },
    { label: 'RENACYT', status: 'idle', message: '' },
    { label: 'Pure', status: 'idle', message: '' },
  ]);
  const [allDone, setAllDone] = useState(false);
  const startedRef = useRef(false);

  const updateTest = useCallback((label: string, result: ConnectivityResult) => {
    setTests((prev) =>
      prev.map((t) =>
        t.label === label ? { ...t, status: result.success ? 'ok' : 'fail', message: result.message } : t,
      ),
    );
  }, []);

  const runTests = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    setTests((prev) => prev.map((t) => ({ ...t, status: 'running', message: 'Probando...' })));

    const mongoResult = await wizardTestMongo(state.mongodbUri);
    updateTest('MongoDB', mongoResult);

    if (state.reniecToken) {
      const reniecResult = await wizardTestReniec(state.reniecToken);
      updateTest('RENIEC', reniecResult);
    } else {
      updateTest('RENIEC', { service: 'RENIEC', success: false, message: 'Sin token configurado' });
    }

    if (state.renacytBaseUrl) {
      const renacytResult = await wizardTestRenacyt(state.renacytBaseUrl);
      updateTest('RENACYT', renacytResult);
    } else {
      updateTest('RENACYT', { service: 'RENACYT', success: false, message: 'Sin URL configurada' });
    }

    if (state.pureApiKey) {
      const pureResult = await wizardTestPure(
        state.renacytBaseUrl ? state.renacytBaseUrl.replace('renacyt-backend', '') + 'pure.unf.edu.pe/ws/api' : 'https://pure.unf.edu.pe/ws/api',
        state.pureApiKey,
      );
      updateTest('Pure', pureResult);
    } else {
      updateTest('Pure', { service: 'Pure', success: false, message: 'Sin API key configurada' });
    }

    setAllDone(true);
    update('results', { mongo: mongoResult?.success });
  }, [state.mongodbUri, state.reniecToken, state.renacytBaseUrl, state.pureApiKey, update, updateTest]);

  useEffect(() => {
    void runTests();
  }, []);

  const mongoOk = tests.find((t) => t.label === 'MongoDB')?.status === 'ok';

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case 'running':
        return <AppIcon icon={Loader2} size={18} className="spinning" />;
      case 'ok':
        return <AppIcon icon={CheckCircle} size={18} className="test-icon-ok" />;
      case 'fail':
        return <AppIcon icon={XCircle} size={18} className="test-icon-fail" />;
      default:
        return <AppIcon icon={Wifi} size={18} />;
    }
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <AppIcon icon={Wifi} size={32} />
        <h2>Prueba de conectividad</h2>
        <p>Verificando conexion con los servicios configurados.</p>
      </div>

      <div className="wizard-tests">
        {tests.map((t) => (
          <div key={t.label} className={`wizard-test-row wizard-test-${t.status}`}>
            <span className="wizard-test-icon">{statusIcon(t.status)}</span>
            <div className="wizard-test-info">
              <strong>{t.label}</strong>
              <span className="wizard-test-msg">{t.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-nav">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Atras
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!allDone || !mongoOk}
          onClick={onNext}
        >
          {allDone ? 'Continuar' : 'Probando...'}
        </button>
      </div>
    </div>
  );
};
