import React from 'react';
import { Server } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import { FormInput } from '@/shared/forms/FormInput';
import type { WizardState } from '../useWizardState';

interface Props {
  state: WizardState;
  update: (key: keyof WizardState, value: string | number | Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepCredentials: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const canContinue = state.mongodbUri.trim().length > 0;

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <AppIcon icon={Server} size={32} />
        <h2>Credenciales de servicios</h2>
        <p>
          Configure los servicios que PJUPI necesita para funcionar. Los servicios marcados con *
          son obligatorios.
        </p>
      </div>

      <div className="form">
        <div className="wizard-section">
          <h3 className="wizard-section-title">Base de datos *</h3>
          <FormInput
            label="MongoDB URI"
            value={state.mongodbUri}
            onChange={(v) => { update('mongodbUri', v); }}
            placeholder="mongodb+srv://usuario:password@cluster.mongodb.net"
            required
            help="URI de conexion a su cluster MongoDB. Debe comenzar con mongodb:// o mongodb+srv://"
          />
          <FormInput
            label="Nombre de la base de datos"
            value={state.mongodbDb}
            onChange={(v) => { update('mongodbDb', v); }}
            placeholder="pjvpin"
          />
        </div>

        <div className="wizard-section">
          <h3 className="wizard-section-title">Servicios externos (opcional)</h3>
          <FormInput
            label="Token RENIEC"
            value={state.reniecToken}
            onChange={(v) => { update('reniecToken', v); }}
            placeholder="sk_..."
            type="password"
            help="Token para consulta de DNI via RENIEC. Si no lo tiene, deje vacio. Las consultas DNI se realizaran manualmente."
          />
          <FormInput
            label="URL base RENACYT"
            value={state.renacytBaseUrl}
            onChange={(v) => { update('renacytBaseUrl', v); }}
            placeholder="https://renacyt.concytec.gob.pe/renacyt-backend"
            help="API de RENACYT para consulta de investigadores."
          />
          <FormInput
            label="Pure API Key"
            value={state.pureApiKey}
            onChange={(v) => { update('pureApiKey', v); }}
            placeholder="..."
            type="password"
            help="API key de Pure (Elsevier) para sincronizacion de publicaciones."
          />
        </div>

        <div className="wizard-nav">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Atras
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canContinue}
            onClick={onNext}
          >
            Probar conectividad
          </button>
        </div>
      </div>
    </div>
  );
};
