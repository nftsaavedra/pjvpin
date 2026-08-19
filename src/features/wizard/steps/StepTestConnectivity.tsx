import React, { useCallback, useEffect, useRef, useState } from "react";
import { Wifi } from "lucide-react";
import {
  wizardTestMongo,
  wizardTestReniec,
  wizardTestRenacyt,
  wizardTestPure,
  type ConnectivityResult,
} from "@/shared/tauri/wizard";
import { DEFAULT_PURE_API_BASE_URL } from "@/shared/config/defaults";
import { messages } from "@/shared/feedback/messages";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { ConnectivityRow, type ConnectivityStatus } from "../components/ConnectivityRow";
import type { WizardState } from "../useWizardState";

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TestEntry {
  label: string;
  status: ConnectivityStatus;
  message: string;
  optional: boolean;
}

export const StepTestConnectivity: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const [tests, setTests] = useState<TestEntry[]>(() => [
    { label: "MongoDB", status: "idle", message: "", optional: false },
    { label: "RENIEC", status: "idle", message: "", optional: true },
    { label: "RENACYT", status: "idle", message: "", optional: true },
    { label: "Pure", status: "idle", message: "", optional: true },
  ]);
  const [allDone, setAllDone] = useState(false);
  const startedRef = useRef(false);

  const setEntry = useCallback((label: string, status: ConnectivityStatus, message: string) => {
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

    setTests((prev) =>
      prev.map((t) => ({ ...t, status: "running", message: messages.wizard.probando })),
    );

    const mongoResult: ConnectivityResult = applyResult(
      "MongoDB",
      await wizardTestMongo(state.mongodbUri),
    );

    let reniecResult: ConnectivityResult | null = null;
    if (state.reniecToken.trim()) {
      reniecResult = applyResult("RENIEC", await wizardTestReniec(state.reniecToken));
    } else {
      setEntry("RENIEC", "skipped", messages.wizard.sinTokenConfigurado);
    }

    let renacytResult: ConnectivityResult | null = null;
    if (state.renacytBaseUrl.trim()) {
      renacytResult = applyResult("RENACYT", await wizardTestRenacyt(state.renacytBaseUrl));
    } else {
      setEntry("RENACYT", "skipped", messages.wizard.sinUrlConfigurada);
    }

    let pureResult: ConnectivityResult | null = null;
    if (state.pureApiKey.trim()) {
      pureResult = applyResult(
        "Pure",
        await wizardTestPure(DEFAULT_PURE_API_BASE_URL, state.pureApiKey),
      );
    } else {
      setEntry("Pure", "skipped", messages.wizard.sinApiKeyConfigurada);
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
    setTests((prev) =>
      prev.map((t) => ({ ...t, status: "running", message: messages.wizard.probando })),
    );
    void runTests();
  };

  const hasAnyFailure = tests.some((t) => t.status === "fail");
  const requiredFailure = tests.find((t) => !t.optional && t.status === "fail") !== undefined;

  const canContinue = allDone && !requiredFailure;

  return (
    <div className="flex flex-col">
      <StepHeader
        icon={Wifi}
        title={messages.wizard.stepTitle.connectivity}
        description={messages.wizard.stepDesc.connectivity}
      />

      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2.5" role="list">
          {tests.map((t) => (
            <ConnectivityRow
              key={t.label}
              label={t.label}
              status={t.status}
              message={t.message}
              optional={t.optional}
            />
          ))}
        </div>

        {allDone && requiredFailure && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong className="font-bold">MongoDB no responde.</strong> Corrige la URI antes de
            continuar.
          </div>
        )}
        {allDone && hasAnyFailure && !requiredFailure && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Algún servicio opcional falló. Puedes continuar y configurarlo después.
          </div>
        )}

        <StepFooter
          onBack={onBack}
          backLabel={messages.wizard.atras}
          primaryLabel={allDone ? messages.wizard.continuar : messages.wizard.probando}
          primaryDisabled={!canContinue}
          onPrimary={onNext}
          secondaryAction={
            allDone && hasAnyFailure
              ? { label: messages.ui.reintentar, onClick: handleRetry }
              : undefined
          }
        />
      </div>
    </div>
  );
};
