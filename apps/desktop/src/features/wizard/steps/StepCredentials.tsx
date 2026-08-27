import React from "react";
import { Server } from "lucide-react";
import { messages } from "@/shared/feedback/messages";
import { FormInput } from "@/shared/forms/FormInput";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import type { WizardState } from "../useWizardState";

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepCredentials: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const uriTrim = state.mongodbUri.trim();
  const hasValidUriFormat =
    uriTrim.startsWith("mongodb://") || uriTrim.startsWith("mongodb+srv://");
  const canContinue = uriTrim.length > 0 && hasValidUriFormat;

  return (
    <div className="flex flex-col">
      <StepHeader
        icon={Server}
        title={messages.wizard.stepTitle.credentials}
        description={messages.wizard.stepDesc.credentials}
      />

      <div className="p-6 flex flex-col gap-6">
        <section
          className="rounded-xl border border-border bg-card"
          aria-labelledby="wizard-required-section"
        >
          <header className="px-4 py-3 border-b border-border bg-primary-light/50 rounded-t-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="wizard-required-section" className="text-sm font-bold text-primary-dark m-0">
                {messages.wizard.requiredSection.title}
              </h2>
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-primary-dark">
                Requerido
              </span>
            </div>
            <p className="text-xs text-text-secondary m-0 mt-0.5">
              {messages.wizard.requiredSection.descripcion}
            </p>
          </header>

          <div className="p-4 flex flex-col gap-4">
            <FormInput
              label="MongoDB URI"
              value={state.mongodbUri}
              onChange={(v) => {
                update("mongodbUri", v);
              }}
              placeholder="mongodb+srv://usuario:password@cluster.mongodb.net"
              required
              help={messages.wizard.formHelp.mongoUri}
            />
            {uriTrim.length > 0 && !hasValidUriFormat && (
              <span className="form-hint form-hint-error -mt-3">
                {messages.wizard.uriMongoInvalida}
              </span>
            )}
            <FormInput
              label="Nombre de la base de datos"
              value={state.mongodbDb}
              onChange={(v) => {
                update("mongodbDb", v);
              }}
              placeholder="pjvpin"
            />
          </div>
        </section>

        <section
          className="rounded-xl border border-dashed border-border bg-bg/40"
          aria-labelledby="wizard-optional-section"
        >
          <header className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="wizard-optional-section"
                className="text-sm font-bold text-text-secondary m-0"
              >
                {messages.wizard.optionalSection.title}
              </h2>
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-secondary">
                Opcional
              </span>
            </div>
            <p className="text-xs text-text-secondary m-0 mt-0.5">
              {messages.wizard.optionalSection.descripcion}
            </p>
          </header>

          <div className="p-4 flex flex-col gap-4">
            <FormInput
              label="Token RENIEC"
              value={state.reniecToken}
              onChange={(v) => {
                update("reniecToken", v);
              }}
              placeholder="sk_..."
              type="password"
              help={messages.wizard.formHelp.reniecToken}
            />
            <FormInput
              label="URL base RENACYT"
              value={state.renacytBaseUrl}
              onChange={(v) => {
                update("renacytBaseUrl", v);
              }}
              placeholder="https://renacyt.concytec.gob.pe/renacyt-backend"
              help={messages.wizard.formHelp.renacytUrl}
            />
            <FormInput
              label="Pure API Key"
              value={state.pureApiKey}
              onChange={(v) => {
                update("pureApiKey", v);
              }}
              placeholder="sk_..."
              type="password"
              help={messages.wizard.formHelp.pureKey}
            />
            <FormInput
              label="RUC institucional (PeruCRIS)"
              value={state.perucrisRuc}
              onChange={(v) => {
                update("perucrisRuc", v.replace(/\D/g, "").slice(0, 11));
              }}
              placeholder="20526270364"
              maxLength={11}
              help={messages.wizard.formHelp.perucrisRuc}
            />
            <FormInput
              label="PeruCRIS API Key"
              value={state.perucrisApiKey}
              onChange={(v) => {
                update("perucrisApiKey", v);
              }}
              placeholder="opcional — solo si dispone de una api-key de CONCYTEC"
              type="password"
              help={messages.wizard.formHelp.perucrisApiKey}
            />
          </div>
        </section>

        <StepFooter
          onBack={onBack}
          backLabel={messages.wizard.atras}
          primaryLabel={messages.wizard.continuar}
          primaryDisabled={!canContinue}
          onPrimary={onNext}
        />
      </div>
    </div>
  );
};
