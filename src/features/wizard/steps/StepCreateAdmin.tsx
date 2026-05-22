import React, { useId, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppIcon } from '@/shared/ui/AppIcon';
import { getTauriErrorMessage, registrarPrimerUsuario } from '@/features/auth/api';
import { toast } from '@/services/toast';
import type { Usuario } from '@/services/tauri/types';

interface Props {
  onNext: (usuario: Usuario) => void;
  onBack: () => void;
}

export const StepCreateAdmin: React.FC<Props> = ({ onNext, onBack }) => {
  const usernameId = useId();
  const fullNameId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canCreate =
    username.trim().length > 0 &&
    nombreCompleto.trim().length > 0 &&
    password.trim().length >= 8 &&
    password === confirmPassword;

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    setIsLoading(true);
    try {
      const usuario = await registrarPrimerUsuario(username, nombreCompleto, password);
      toast.success('Usuario superuser creado correctamente');
      onNext(usuario);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <AppIcon icon={ShieldCheck} size={32} />
        <h2>Crear usuario superuser</h2>
        <p>
          Este es el primer usuario del sistema con maximo nivel de acceso. Podra gestionar
          usuarios, configurar servicios externos y administrar el sistema completo.
        </p>
      </div>

      <form className="form" onSubmit={(e) => { void handleCreate(e); }}>
        <div className="form-group">
          <label htmlFor={usernameId}>Username *</label>
          <input
            id={usernameId}
            className="form-input"
            value={username}
            onChange={(e) => { setUsername(e.target.value); }}
            placeholder="Ej: superuser"
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={fullNameId}>Nombre completo *</label>
          <input
            id={fullNameId}
            className="form-input"
            value={nombreCompleto}
            onChange={(e) => { setNombreCompleto(e.target.value); }}
            placeholder="Ej: Administrador del Sistema"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={passwordId}>Contraseña *</label>
          <input
            id={passwordId}
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            placeholder="Minimo 8 caracteres, mayuscula, digito y especial"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={confirmId}>Confirmar contraseña *</label>
          <input
            id={confirmId}
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); }}
            placeholder="Repita la contraseña"
            autoComplete="new-password"
            required
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <span className="form-hint form-hint-error">Las contraseñas no coinciden</span>
          )}
        </div>

        <div className="auth-note">
          Usuario con rol <strong>superuser</strong>. Unico en el sistema. No se puede eliminar
          desde la interfaz.
        </div>

        <div className="wizard-nav">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Atras
          </button>
          <button type="submit" className="btn-primary" disabled={!canCreate || isLoading}>
            {isLoading ? 'Creando...' : 'Crear superuser'}
          </button>
        </div>
      </form>
    </div>
  );
};
