import React from "react";
import { Pencil, Plus, RotateCcw, Save, ShieldPlus, Trash2 } from "lucide-react";
import { useUsuariosTab } from "./hooks/useUsuariosTab";
import { DniField } from "@/shared/forms/DniField";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { FormSelect } from "@/shared/forms/FormSelect";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { getRoleDefinition, getRoleLabel, getRoleOptions } from "@/shared/auth/permissions";
import type { Usuario } from "../../auth/api";

interface UsuariosTabProps {
  currentUser: Usuario;
  onUsuarioModified: () => void;
  refreshTrigger?: number;
}

const roles = getRoleOptions();

export const UsuariosTab: React.FC<UsuariosTabProps> = ({
  currentUser,
  onUsuarioModified,
  refreshTrigger = 0,
}) => {
  const {
    dni,
    busqueda,
    editingUsuario,
    error,
    estadoFiltro,
    handleCloseForm,
    handleEditar,
    handleOpenCreate,
    handleSubmit,
    handleToggleUsuario,
    isFormOpen,
    isLoading,
    loading,
    password,
    recargar,
    rol,
    setBusqueda,
    setEstadoFiltro,
    setPassword,
    setRol,
    setUsername,
    setUsuarioToToggle,
    totalActivos,
    totalInactivos,
    username,
    usuarioToToggle,
    usuarios,
    usuariosFiltrados,
  } = useUsuariosTab(currentUser, refreshTrigger, onUsuarioModified);

  const isEditingOwnUser = editingUsuario?.id_usuario === currentUser.id_usuario;
  const isEditing = Boolean(editingUsuario);

  return (
    <div className="tab-panel">
      <div className="role-matrix-grid">
        {roles.map((roleOption) => {
          const definition = getRoleDefinition(roleOption.value);

          return (
            <article
              key={roleOption.value}
              className={`module-aside-card role-matrix-card ${rol === roleOption.value ? "role-matrix-card-active" : ""}`}
            >
              <span className="module-aside-kicker">Rol operativo</span>
              <strong>{definition.label}</strong>
              <p>{definition.summary}</p>
              <div className="role-matrix-list">
                {definition.capabilities.map((capability) => (
                  <span key={capability} className="role-matrix-item">
                    {capability}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="table-container">
        <div className="section-header">
          <h2>Usuarios registrados</h2>
          <div className="section-header-actions">
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={18} />
                <span>Nuevo usuario</span>
              </span>
            </button>
          </div>
        </div>
        {error && (
          <div className="inline-feedback inline-feedback-warning">
            <span>No se pudo refrescar la lista. Se muestran los datos disponibles.</span>
            <button type="button" className="btn-secondary" onClick={() => void recargar()}>
              Reintentar
            </button>
          </div>
        )}
        <div className="filter-bar">
          <div className="filter-summary-group">
            <div className="filter-summary">Visibles: {usuariosFiltrados.length}</div>
            <StatusChip variant="total">Todos: {usuarios.length}</StatusChip>
            <StatusChip variant="success">Activos: {totalActivos}</StatusChip>
            <StatusChip variant="warning">Inactivos: {totalInactivos}</StatusChip>
          </div>
          <input
            className="form-input filter-search"
            placeholder="Buscar por usuario, nombre, DNI o rol"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
            }}
            aria-label="Buscar usuarios por nombre, usuario, DNI o rol"
          />
          <select
            className="form-input filter-select"
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos");
            }}
            aria-label="Filtrar usuarios por estado"
          >
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>

        {loading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : usuariosFiltrados.length === 0 ? (
          <div className="empty-state">No hay usuarios para el filtro seleccionado</div>
        ) : (
          <table className="table" aria-label="Tabla de usuarios registrados">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td>{usuario.username}</td>
                  <td>
                    <code className="text-xs">{usuario.dni ?? "—"}</code>
                  </td>
                  <td>{usuario.nombre_completo}</td>
                  <td>
                    <Badge variant="info">{getRoleLabel(usuario.rol)}</Badge>
                  </td>
                  <td>
                    {usuario.activo === 1 ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="warning">Inactivo</Badge>
                    )}
                  </td>
                  <td className="table-actions">
                    <TableActionButton
                      className="btn-edit"
                      icon={Pencil}
                      label={
                        usuario.id_usuario === currentUser.id_usuario
                          ? "Editar su propio usuario"
                          : "Editar usuario"
                      }
                      onClick={() => {
                        handleEditar(usuario);
                      }}
                    />
                    <TableActionButton
                      className={usuario.activo === 1 ? "btn-delete" : "btn-primary"}
                      icon={usuario.activo === 1 ? Trash2 : RotateCcw}
                      label={
                        usuario.id_usuario === currentUser.id_usuario
                          ? "No puede cambiar su propio estado"
                          : usuario.activo === 1
                            ? "Desactivar usuario"
                            : "Reactivar usuario"
                      }
                      onClick={() => {
                        setUsuarioToToggle(usuario);
                      }}
                      disabled={usuario.id_usuario === currentUser.id_usuario}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormModal
        open={isFormOpen}
        title={
          <span className="title-with-icon form-card-title">
            <AppIcon icon={editingUsuario ? Pencil : ShieldPlus} size={20} />
            <span>{editingUsuario ? "Editar Usuario" : "Crear Usuario"}</span>
          </span>
        }
        description={
          isEditing
            ? "Modifique username, rol y opcionalmente contraseña. La identidad (DNI/nombres) se gestiona desde la Persona vinculada."
            : "Ingrese el DNI para autocompletar nombres desde RENIEC. La identidad se vincula a una Persona del sistema."
        }
        onClose={handleCloseForm}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        submitText={
          <span className="button-with-icon">
            <AppIcon icon={Save} size={18} />
            <span>{editingUsuario ? "Guardar cambios" : "Crear usuario"}</span>
          </span>
        }
        isLoading={isLoading}
      >
        {!isEditing && (
          <DniField
            dni={dni.dni}
            onDniChange={dni.setDni}
            onValidate={() => {
              void dni.handleValidar();
            }}
            isChecking={dni.isChecking}
            canValidate={dni.puedeValidar}
            validationStatus={dni.status}
            validationMessage={dni.message}
            isLoading={isLoading}
            inputId="usuarios-tab-dni"
            helpText="Valide el DNI contra RENIEC para autocompletar nombres y apellidos del nuevo usuario."
          />
        )}

        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Nombres"
              value={dni.nombres}
              onChange={dni.setNombres}
              placeholder={dni.isValidated ? "" : "Valide el DNI para autocompletar"}
              required
              readOnly={dni.isValidated}
              disabled={!dni.isValidated}
            />
            <FormInput
              label="Apellido paterno"
              value={dni.apellidoPaterno}
              onChange={dni.setApellidoPaterno}
              placeholder={dni.isValidated ? "" : "Valide el DNI para autocompletar"}
              required
              readOnly={dni.isValidated}
              disabled={!dni.isValidated}
            />
            <FormInput
              label="Apellido materno"
              value={dni.apellidoMaterno}
              onChange={dni.setApellidoMaterno}
              placeholder={dni.isValidated ? "" : "Valide el DNI para autocompletar"}
              readOnly={dni.isValidated}
              disabled={!dni.isValidated}
            />
          </div>
        )}

        {isEditing && dni.dni && (
          <div className="inline-feedback inline-feedback-info">
            Identidad vinculada al DNI <strong>{dni.dni}</strong>. La edicion de identidad se
            gestiona desde la ficha de Persona correspondiente.
          </div>
        )}

        <FormInput
          label="Usuario"
          value={username}
          onChange={setUsername}
          placeholder="Ej: jlopez"
          help="Use un identificador corto, sin espacios, para facilitar el acceso y la búsqueda interna del usuario."
          required
        />
        <FormSelect
          label="Rol"
          value={rol}
          onChange={setRol}
          options={roles}
          help={
            isEditingOwnUser
              ? "No puede cambiar su propio rol. Otro administrador debe realizar esa operación para preservar el control de accesos."
              : "El rol define los permisos disponibles dentro del sistema. Asigne el mínimo acceso necesario según la función del usuario."
          }
          disabled={isEditingOwnUser}
          required
        />
        {isEditingOwnUser && (
          <div className="inline-feedback inline-feedback-info">
            <span>
              Puede actualizar su nombre o contraseña, pero no cambiar su propio rol ni su estado.
            </span>
          </div>
        )}
        <FormInput
          label={editingUsuario ? "Nueva contraseña (opcional)" : "Contraseña"}
          value={password}
          onChange={setPassword}
          placeholder={editingUsuario ? "Dejar vacío para conservarla" : "Mínimo 8 caracteres"}
          help={
            editingUsuario
              ? "Complete este campo solo si necesita reemplazar la contraseña actual. Si lo deja vacío, se conservará la existente."
              : "Defina una contraseña de al menos 8 caracteres. Evite claves obvias o reutilizadas."
          }
          required={!editingUsuario}
        />
      </FormModal>

      <ConfirmDialog
        open={Boolean(usuarioToToggle)}
        title={usuarioToToggle?.activo === 1 ? "Desactivar usuario" : "Reactivar usuario"}
        message={
          usuarioToToggle?.activo === 1
            ? `¿Desea desactivar al usuario "${usuarioToToggle.username}"?`
            : `¿Desea reactivar al usuario "${usuarioToToggle?.username}"?`
        }
        confirmText={usuarioToToggle?.activo === 1 ? "Sí, desactivar" : "Sí, reactivar"}
        cancelText="Cancelar"
        onConfirm={() => {
          void handleToggleUsuario();
        }}
        onCancel={() => {
          setUsuarioToToggle(null);
        }}
      />
    </div>
  );
};
