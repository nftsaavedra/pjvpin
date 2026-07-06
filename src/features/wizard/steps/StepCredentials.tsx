import React from "react";
import { Server } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { FormInput } from "@/shared/forms/FormInput";
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
    <div className="flex flex-col gap-6">
      <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-primary-light to-card">
        <div className="text-center">
          <AppIcon icon={Server} size={32} className="text-primary mb-2" />
          <h2 className="text-xl font-bold m-0 mb-1.5 text-text-primary">
            Credenciales de servicios
          </h2>
          <p className="text-sm leading-6 max-w-[44ch] mx-auto text-text-secondary">
            Configure los servicios que PJUPI necesita para funcionar. Los servicios marcados con *
            son obligatorios.
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="form">
          <div className="border-t border-border pt-4 mt-1">
            <h3 className="text-sm font-bold m-0 mb-3 uppercase tracking-[0.04em] text-text-primary">
              Base de datos *
            </h3>
            <FormInput
              label="MongoDB URI"
              value={state.mongodbUri}
              onChange={(v) => {
                update("mongodbUri", v);
              }}
              placeholder="mongodb+srv://usuario:password@cluster.mongodb.net"
              required
              help="URI de conexion a su cluster MongoDB. Debe comenzar con mongodb:// o mongodb+srv://"
            />
            {uriTrim.length > 0 && !hasValidUriFormat && (
              <span className="form-hint form-hint-error">
                La URI debe comenzar con mongodb:// o mongodb+srv://
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

          <div className="border-t border-border pt-4 mt-1">
            <h3 className="text-sm font-bold m-0 mb-3 uppercase tracking-[0.04em] text-text-primary">
              Servicios externos (opcional)
            </h3>
            <FormInput
              label="Token RENIEC"
              value={state.reniecToken}
              onChange={(v) => {
                update("reniecToken", v);
              }}
              placeholder="sk_..."
              type="password"
              help="Token para consulta de DNI via RENIEC. Si no lo tiene, deje vacio. Las consultas DNI se realizaran manualmente."
            />
            <FormInput
              label="URL base RENACYT"
              value={state.renacytBaseUrl}
              onChange={(v) => {
                update("renacytBaseUrl", v);
              }}
              placeholder="https://renacyt.concytec.gob.pe/renacyt-backend"
              help="API de RENACYT para consulta de investigadores."
            />
            <FormInput
              label="Pure API Key"
              value={state.pureApiKey}
              onChange={(v) => {
                update("pureApiKey", v);
              }}
              placeholder="..."
              type="password"
              help="API key de Pure (Elsevier) para sincronizacion de publicaciones."
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" className="btn-secondary shrink-0" onClick={onBack}>
              Atras
            </button>
            <button
              type="button"
              className="btn-primary ml-auto"
              disabled={!canContinue}
              onClick={onNext}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
