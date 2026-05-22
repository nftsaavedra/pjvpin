import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import { getTauriErrorMessage } from '@/services/tauri/error';
import { wizardSaveConfig } from '@/services/tauri/wizard';
import { toast } from '@/services/toast';
import type { WizardConfigRequest } from '@/services/tauri/wizard';
import type { Usuario } from '@/services/tauri/types';

interface Props {
  request: WizardConfigRequest;
  usuario: Usuario;
  onDone: (usuario: Usuario) => void;
}

export const StepSummary: React.FC<Props> = ({ request, usuario, onDone }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await wizardSaveConfig(request);
      toast.success('Configuracion guardada correctamente');
      onDone(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const masked = (val: string | undefined, show = 4) => {
    if (!val) return '(no configurado)';
    if (val.length <= show) return '***';
    return val.slice(0, show) + '***';
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <AppIcon icon={Save} size={32} />
        <h2>Resumen de configuracion</h2>
        <p>Revise los datos antes de guardar. La configuracion se cifrara con su contraseña maestra.</p>
      </div>

      <div className="wizard-summary">
        <div className="wizard-summary-section">
          <h3>Base de datos</h3>
          <div className="wizard-summary-row">
            <span>MongoDB URI</span>
            <code>{request.mongodbUri}</code>
          </div>
          <div className="wizard-summary-row">
            <span>Base de datos</span>
            <code>{request.mongodbDb ?? 'pjupi'}</code>
          </div>
        </div>

        <div className="wizard-summary-section">
          <h3>Servicios externos</h3>
          <div className="wizard-summary-row">
            <span>RENIEC</span>
            <code>{masked(request.reniecToken)}</code>
          </div>
          <div className="wizard-summary-row">
            <span>RENACYT</span>
            <code>{request.renacytBaseUrl ?? 'Por defecto'}</code>
          </div>
          <div className="wizard-summary-row">
            <span>Pure API Key</span>
            <code>{masked(request.pureApiKey)}</code>
          </div>
        </div>

        <div className="wizard-summary-section">
          <h3>Usuario superuser</h3>
          <div className="wizard-summary-row">
            <span>Username</span>
            <strong>@{usuario.username}</strong>
          </div>
          <div className="wizard-summary-row">
            <span>Nombre</span>
            <strong>{usuario.nombre_completo}</strong>
          </div>
          <div className="wizard-summary-row">
            <span>Rol</span>
            <span className="status-chip status-chip-total">superuser</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary wizard-next"
        disabled={saving}
        onClick={() => { void handleSave(); }}
      >
        {saving ? 'Guardando...' : 'Guardar configuracion e iniciar'}
      </button>
    </div>
  );
};
