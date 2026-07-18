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
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonTable } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { TableActionButton } from "@/shared/ui/TableActionButton";
import { getRoleDefinition, getRoleLabel, getRoleOptions } from "@/shared/auth/permissions";
import { messages } from "@/shared/feedback/messages";
import { RoleMatrixCard } from "./components/RoleMatrixCard";
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
    isCargandoPersona,
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

  const hasActiveFilters = estadoFiltro !== "todos" || busqueda.trim() !== "";
  const limpiarFiltros = () => {
    setEstadoFiltro("todos");
    setBusqueda("");
  };

  return (
    <div className="tab-panel">
      <div className="role-matrix-grid">
        {roles.map((roleOption) => {
          const definition = getRoleDefinition(roleOption.value);
          return (
            <RoleMatrixCard
              key={roleOption.value}
              label={definition.label}
              summary={definition.summary}
              modules={definition.modules}
              isActive={rol === roleOption.value}
            />
          );
        })}
      </div>

      <div className="table-container">
        <div className="section-header">
          <h2>{messages.usuarios.tab.sectionTitle}</h2>
          <div className="section-header-actions">
            <button type="button" className="btn-primary" onClick={handleOpenCreate}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={18} />
                <span>{messages.usuarios.tab.nuevoUsuario}</span>
              </span>
            </button>
          </div>
        </div>
        {error ? (
          <EmptyState
            variant="error"
            message={messages.ui.errorCarga("usuarios")}
            actionLabel={messages.ui.reintentar}
            onAction={() => {
              void recargar();
            }}
            data-testid="usuarios-empty-error"
          />
        ) : (
          <>
            <div className="filter-bar">
              <div className="filter-summary-group">
                <div className="filter-summary">
                  {messages.configuracion.filter.visibles(usuariosFiltrados.length)}
                </div>
                <StatusChip variant="total">
                  {messages.configuracion.filter.todos(usuarios.length)}
                </StatusChip>
                <StatusChip variant="success">
                  {messages.configuracion.filter.activos(totalActivos)}
                </StatusChip>
                <StatusChip variant="warning">
                  {messages.configuracion.filter.inactivos(totalInactivos)}
                </StatusChip>
              </div>
              <input
                className="form-input filter-search"
                placeholder={messages.usuarios.tab.searchPlaceholder}
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                }}
                aria-label={messages.usuarios.tab.searchAriaLabel}
              />
              <select
                className="form-input filter-select"
                value={estadoFiltro}
                onChange={(e) => {
                  setEstadoFiltro(e.target.value as "todos" | "activos" | "inactivos");
                }}
                aria-label={messages.usuarios.tab.filtroEstadoAriaLabel}
              >
                <option value="todos">{messages.configuracion.filter.opciones.todos}</option>
                <option value="activos">
                  {messages.configuracion.filter.opciones.soloActivos}
                </option>
                <option value="inactivos">
                  {messages.configuracion.filter.opciones.soloInactivos}
                </option>
              </select>
            </div>

            {loading ? (
              <SkeletonTable columns={6} rows={5} />
            ) : usuariosFiltrados.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  variant="filtered"
                  message={messages.ui.filteredEmpty("usuarios")}
                  actionLabel={messages.ui.emptyStateCtas.limpiarFiltros}
                  onAction={limpiarFiltros}
                  data-testid="usuarios-empty-filtered"
                />
              ) : (
                <EmptyState
                  variant="empty"
                  message={messages.ui.emptyState("usuarios")}
                  actionLabel={messages.ui.emptyStateCtas.crearPrimero("usuario")}
                  onAction={handleOpenCreate}
                  data-testid="usuarios-empty-initial"
                />
              )
            ) : (
              <table className="table" aria-label={messages.usuarios.tab.tableAriaLabel}>
                <thead>
                  <tr>
                    <th scope="col">{messages.usuarios.tab.columns.usuario}</th>
                    <th scope="col">{messages.usuarios.tab.columns.dni}</th>
                    <th scope="col">{messages.usuarios.tab.columns.nombre}</th>
                    <th scope="col">{messages.usuarios.tab.columns.rol}</th>
                    <th scope="col">{messages.usuarios.tab.columns.estado}</th>
                    <th scope="col">{messages.usuarios.tab.columns.acciones}</th>
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
                          <Badge variant="success">{messages.ui.statusActivo}</Badge>
                        ) : (
                          <Badge variant="warning">{messages.ui.statusInactivo}</Badge>
                        )}
                      </td>
                      <td className="table-actions">
                        <TableActionButton
                          className="btn-edit"
                          icon={Pencil}
                          label={
                            usuario.id_usuario === currentUser.id_usuario
                              ? messages.usuarios.tab.actions.editarPropio
                              : messages.usuarios.tab.actions.editar
                          }
                          onClick={() => {
                            void handleEditar(usuario);
                          }}
                        />
                        <TableActionButton
                          className={usuario.activo === 1 ? "btn-delete" : "btn-primary"}
                          icon={usuario.activo === 1 ? Trash2 : RotateCcw}
                          label={
                            usuario.id_usuario === currentUser.id_usuario
                              ? messages.usuarios.tab.actions.noCambiaEstado
                              : usuario.activo === 1
                                ? messages.usuarios.tab.actions.desactivar
                                : messages.usuarios.tab.actions.reactivar
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
          </>
        )}
      </div>

      <FormModal
        open={isFormOpen}
        title={
          <span className="title-with-icon form-card-title">
            <AppIcon icon={editingUsuario ? Pencil : ShieldPlus} size={20} />
            <span>
              {editingUsuario
                ? messages.usuarios.tab.modal.editar
                : messages.usuarios.tab.modal.crear}
            </span>
          </span>
        }
        onClose={handleCloseForm}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        submitText={
          <span className="button-with-icon">
            <AppIcon icon={Save} size={18} />
            <span>
              {editingUsuario
                ? messages.usuarios.tab.modal.submitEditar
                : messages.usuarios.tab.modal.submitCrear}
            </span>
          </span>
        }
        isLoading={isLoading}
      >
        <div className="p-6">
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
            />
          )}

          {!isEditing && dni.isValidated && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Nombres"
                value={dni.nombres}
                onChange={dni.setNombres}
                placeholder=""
                required
                readOnly
                disabled
              />
              <FormInput
                label="Apellido paterno"
                value={dni.apellidoPaterno}
                onChange={dni.setApellidoPaterno}
                placeholder=""
                required
                readOnly
                disabled
              />
              <FormInput
                label="Apellido materno"
                value={dni.apellidoMaterno}
                onChange={dni.setApellidoMaterno}
                placeholder=""
                readOnly
                disabled
              />
            </div>
          )}

          {isEditing && isCargandoPersona && (
            <div className="inline-feedback inline-feedback-info" aria-live="polite">
              <span>{messages.ui.cargando}</span>
            </div>
          )}

          {isEditing && dni.dni && !isCargandoPersona && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Nombres"
                value={dni.nombres}
                onChange={dni.setNombres}
                required
                disabled={!dni.nombres}
              />
              <FormInput
                label="Apellido paterno"
                value={dni.apellidoPaterno}
                onChange={dni.setApellidoPaterno}
                required
                disabled={!dni.apellidoPaterno}
              />
              <FormInput
                label="Apellido materno"
                value={dni.apellidoMaterno}
                onChange={dni.setApellidoMaterno}
                disabled={!dni.apellidoMaterno}
              />
            </div>
          )}

          <FormInput
            label="Usuario"
            value={username}
            onChange={setUsername}
            placeholder="Ej: jlopez"
            required
          />
          <FormSelect
            label="Rol"
            value={rol}
            onChange={setRol}
            options={roles}
            help={isEditingOwnUser ? "No puede auto-asignarse otro rol." : undefined}
            disabled={isEditingOwnUser}
            required
          />
          <FormInput
            label={editingUsuario ? "Nueva contraseña (opcional)" : "Contraseña"}
            value={password}
            onChange={setPassword}
            placeholder={editingUsuario ? "Dejar vacío para conservarla" : "Mínimo 8 caracteres"}
            required={!editingUsuario}
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(usuarioToToggle)}
        title={
          usuarioToToggle?.activo === 1
            ? messages.usuarios.tab.confirm.desactivar.title
            : messages.usuarios.tab.confirm.reactivar.title
        }
        message={
          usuarioToToggle?.activo === 1
            ? messages.usuarios.tab.confirm.desactivar.message(usuarioToToggle.username)
            : messages.usuarios.tab.confirm.reactivar.message(usuarioToToggle?.username ?? "")
        }
        confirmText={
          usuarioToToggle?.activo === 1
            ? messages.configuracion.confirm.siDesactivar
            : messages.configuracion.confirm.siReactivar
        }
        cancelText={messages.ui.cancelar}
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
