import React, { useState } from "react";
import { Globe } from "lucide-react";
import { FormInput } from "@/shared/forms/FormInput";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { checkHealth, type HealthStatus } from "@/features/auth/api";
import { getApiUrl, setApiUrl } from "@/shared/http/config";

interface Props {
  onNext: (health: HealthStatus) => void;
}

export const StepApiUrl: React.FC<Props> = ({ onNext }) => {
  const [apiUrl, setApiUrlState] = useState(getApiUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const handleTest = async () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      setError("Ingrese la URL del API.");
      return;
    }
    setIsTesting(true);
    setError(null);
    setHealth(null);
    try {
      setApiUrl(trimmed);
      const result = await checkHealth();
      setHealth(result);
      onNext(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`No se pudo conectar al API: ${message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <StepHeader
        icon={Globe}
        title="Configurar servidor"
        description="Configura la URL del servidor API NestJS."
      />

      <div className="p-6 flex flex-col gap-5">
        <FormInput
          label="URL del API"
          value={apiUrl}
          onChange={setApiUrlState}
          placeholder="http://localhost:18080"
          required
          disabled={isTesting}
        />

        {error && (
          <div className="inline-feedback inline-feedback-error">{error}</div>
        )}

        {health && (
          <div className="inline-feedback inline-feedback-success">
            API conectada (v{health.version})
            {health.requires_setup
              ? " — Se requiere configuracion inicial (bootstrap)."
              : " — Sistema ya configurado."}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleTest();
          }}
        >
          <StepFooter
            primaryLabel={isTesting ? "Probando conexion..." : "Probar conexion y continuar"}
            primaryDisabled={isTesting || !apiUrl.trim()}
            primaryLoading={isTesting}
            primaryType="submit"
          />
        </form>
      </div>
    </div>
  );
};
