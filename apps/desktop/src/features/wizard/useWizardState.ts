import { useCallback, useState } from "react";
import type { HealthStatus } from "@/features/auth/api";

export interface WizardState {
  step: number;
  health: HealthStatus | null;
}

const initialState: WizardState = {
  step: 1,
  health: null,
};

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState);

  const setHealth = useCallback((health: HealthStatus) => {
    setState((prev) => ({ ...prev, health, step: 2 }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  return { state, setHealth, prevStep };
}
