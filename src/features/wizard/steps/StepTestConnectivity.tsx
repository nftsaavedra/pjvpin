import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, Minus, Wifi, XCircle } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FieldHelpTooltip } from "@/shared/forms/FieldHelpTooltip";
import {
  wizardTestMongo,
  wizardTestReniec,
  wizardTestRenacyt,
  wizardTestPure,
  type ConnectivityResult,
} from "@/shared/tauri/wizard";
import { DEFAULT_PURE_API_BASE_URL } from "@/shared/config/defaults";
import type { WizardState } from "../useWizardState";

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

type TestStatus = "idle" | "running" | "ok" | "fail" | "skipped";

interface TestEntry {
  label: string;
  status: TestStatus;
  message: string;
}

const TEST_ROW: Record<TestStatus, string> = {
  idle: "border-border bg-bg",
  running: "border-blue-300 bg-blue-50",
  ok: "border-green-300 bg-green-50",
  fail: "border-red-300 bg-red-50",
  skipped: "border-border bg-bg opacity-70",
};

export const StepTestConnectivity: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const [tests, setTests] = useState<TestEntry[]>(() => [
    { label: "MongoDB", status: "idle", message: "" },
    { label: "RENIEC", status: "idle", message: "" },
    { label: "RENACYT", status: "idle", message: "" },
    { label: "Pure", status: "idle", message: "" },
  ]);
  const [allDone, setAllDone] = useState(false);
  const startedRef = useRef(false);

  const setEntry = useCallback((label: string, status: TestStatus, message: string) => {
    setTests((prev) => prev.map((t) => (t.label === label ? { ...t, status, message } : t)));
  }, []);

  const applyResult = useCallback(
    (label: string, result: ConnectivityResult) => {
      setEntry(label, result.success ? "ok" : "fail", result.message);
      return result;
    },
    [setEntry],
  );

  const runTests = useCallback(async () => {
    startedRef.current = true;

    setTests((prev) => prev.map((t) => ({ ...t, status: "running", message: "Probando..." })));

    const mongoResult: ConnectivityResult = applyResult(
      "MongoDB",
      await wizardTestMongo(state.mongodbUri),
    );

    let reniecResult: ConnectivityResult | null = null;
    if (state.reniecToken.trim()) {
      reniecResult = applyResult("RENIEC", await wizardTestReniec(state.reniecToken));
    } else {
      setEntry("RENIEC", "skipped", "Sin token configurado (opcional)");
    }

    let renacytResult: ConnectivityResult | null = null;
    if (state.renacytBaseUrl.trim()) {
      renacytResult = applyResult("RENACYT", await wizardTestRenacyt(state.renacytBaseUrl));
    } else {
      setEntry("RENACYT", "skipped", "Sin URL configurada (opcional)");
    }

    let pureResult: ConnectivityResult | null = null;
    if (state.pureApiKey.trim()) {
      pureResult = applyResult(
        "Pure",
        await wizardTestPure(DEFAULT_PURE_API_BASE_URL, state.pureApiKey),
      );
    } else {
      setEntry("Pure", "skipped", "Sin API key configurada (opcional)");
    }

    setAllDone(true);
    update("results", {
      mongo: mongoResult.success,
      reniec: reniecResult?.success ?? false,
      renacyt: renacytResult?.success ?? false,
      pure: pureResult?.success ?? false,
    });
  }, [
    state.mongodbUri,
    state.reniecToken,
    state.renacytBaseUrl,
    state.pureApiKey,
    applyResult,
    setEntry,
    update,
  ]);

  useEffect(() => {
    if (startedRef.current) return;
    void runTests();
  }, [runTests]);

  const handleRetry = () => {
    startedRef.current = false;
    setAllDone(false);
    setTests((prev) => prev.map((t) => ({ ...t, status: "running", message: "Probando..." })));
    void runTests();
  };

  const mongoOk = tests.find((t) => t.label === "MongoDB")?.status === "ok";
  const hasAnyFailure = tests.some((t) => t.status === "fail");

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case "running":
        return <AppIcon icon={Loader2} size={18} className="animate-spin text-primary" />;
      case "ok":
        return <AppIcon icon={CheckCircle} size={18} className="text-green-600" />;
      case "fail":
        return <AppIcon icon={XCircle} size={18} className="text-red-600" />;
      case "skipped":
        return <AppIcon icon={Minus} size={18} className="text-text-secondary" />;
      default:
        return <AppIcon icon={Wifi} size={18} />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={Wifi} size={32} className="text-primary mb-2" />
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h2 className="text-xl font-bold m-0 text-text-primary">Prueba de conectividad</h2>
            <FieldHelpTooltip
              label="Informacion sobre servicios opcionales"
              content="Solo MongoDB es obligatorio. RENIEC, RENACYT y Pure son opcionales: puede continuar aunque fallen y configurarlos despues desde Configuracion."
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-2.5">
          {tests.map((t) => (
            <div
              key={t.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${TEST_ROW[t.status]}`}
            >
              <span className="shrink-0 flex">{statusIcon(t.status)}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <strong className="text-sm text-text-primary">{t.label}</strong>
                <span className="text-xs break-words text-text-secondary">{t.message}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 mt-4">
          <button type="button" className="btn-secondary shrink-0" onClick={onBack}>
            Atras
          </button>
          {allDone && hasAnyFailure && (
            <button type="button" className="btn-secondary" onClick={handleRetry}>
              Reintentar
            </button>
          )}
          <button
            type="button"
            className="btn-primary ml-auto"
            disabled={!allDone || !mongoOk}
            onClick={onNext}
          >
            {allDone ? "Continuar" : "Probando..."}
          </button>
        </div>
      </div>
    </div>
  );
};
