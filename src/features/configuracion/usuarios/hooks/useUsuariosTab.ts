import { useMemo, useState } from "react";
import { useFetchUsuarios } from "./useFetchUsuarios";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { toast } from "@/shared/feedback/toast";
import {
  actualizarUsuario,
  consultarDniParaUsuario,
  crearUsuario,
  desactivarUsuario,
  getTauriErrorMessage,
  reactivarUsuario,
  type Usuario,
} from "../../api";
import { useDniValidation } from "@/shared/forms/useDniValidation";

export const useUsuariosTab = (
  currentUser: Usuario,
  refreshTrigger = 0,
  onUsuarioModified: () => void,
) => {
  const dni = useDniValidation({
    consultar: (numero) => consultarDniParaUsuario(numero),
  });
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState("operador");
  const [password, setPassword] = useState("");
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [usuarioToToggle, setUsuarioToToggle] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("activos");
  const [busqueda, setBusqueda] = useState("");

  const { usuarios, loading, refreshing, error, recargar } = useFetchUsuarios(refreshTrigger);

  useRefreshToast({
    refreshing,
    message: "Actualizando usuarios",
    toastKey: "usuarios-refresh",
  });

  const resetForm = () => {
    dni.reset();
    setUsername("");
    setRol("operador");
    setPassword("");
    setEditingUsuario(null);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!username.trim() || !dni.dniLimpio || !rol) {
      toast.warning("Complete todos los campos del usuario");
      return;
    }

    if (!editingUsuario) {
      if (!/^\d{8}$/.test(dni.dniLimpio)) {
        toast.warning("El DNI debe tener exactamente 8 dígitos numéricos");
        return;
      }
      if (!dni.isValidated && (!dni.nombres.trim() || !dni.apellidoPaterno.trim())) {
        toast.warning("Valide el DNI o ingrese nombres y apellido paterno manualmente");
        return;
      }
      if (password.trim().length < 8) {
        toast.warning("La contraseña debe tener al menos 8 caracteres");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (editingUsuario) {
        if (editingUsuario.id_usuario === currentUser.id_usuario && editingUsuario.rol !== rol) {
          toast.warning(
            "No puede cambiar su propio rol. Solicite a otro administrador que lo haga.",
          );
          return;
        }

        await actualizarUsuario(editingUsuario.id_usuario, username, rol, password || undefined);
        toast.success("Usuario actualizado correctamente");
      } else {
        await crearUsuario({
          username,
          dni: dni.dniLimpio,
          nombres: dni.nombres,
          apellidoPaterno: dni.apellidoPaterno,
          apellidoMaterno: dni.apellidoMaterno,
          rol,
          password,
        });
        toast.success("Usuario creado correctamente");
      }

      resetForm();
      setIsFormOpen(false);
      await recargar();
      onUsuarioModified();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setUsername(usuario.username);
    setRol(usuario.rol);
    setPassword("");
    if (usuario.dni) {
      dni.loadFromPersona({
        dni: usuario.dni,
        nombres: "",
        apellidoPaterno: "",
        apellidoMaterno: "",
      });
    } else {
      dni.reset();
    }
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isLoading) return;
    resetForm();
    setIsFormOpen(false);
  };

  const handleToggleUsuario = async () => {
    if (!usuarioToToggle) return;

    if (usuarioToToggle.id_usuario === currentUser.id_usuario) {
      toast.warning("No puede cambiar el estado de su propio usuario.");
      return;
    }

    try {
      if (usuarioToToggle.activo === 1) {
        await desactivarUsuario(usuarioToToggle.id_usuario);
        toast.info("Usuario desactivado correctamente");
      } else {
        await reactivarUsuario(usuarioToToggle.id_usuario);
        toast.success("Usuario reactivado correctamente");
      }

      setUsuarioToToggle(null);
      await recargar();
      onUsuarioModified();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    }
  };

  const totalActivos = useMemo(
    () => usuarios.filter((usuario) => usuario.activo === 1).length,
    [usuarios],
  );
  const totalInactivos = useMemo(
    () => usuarios.filter((usuario) => usuario.activo === 0).length,
    [usuarios],
  );

  const usuariosFiltrados = useMemo(
    () =>
      usuarios
        .filter((usuario) => {
          if (estadoFiltro === "activos") return usuario.activo === 1;
          if (estadoFiltro === "inactivos") return usuario.activo === 0;
          return true;
        })
        .filter((usuario) => {
          const texto = busqueda.trim().toLowerCase();
          if (!texto) return true;
          return (
            usuario.username.toLowerCase().includes(texto) ||
            usuario.nombre_completo.toLowerCase().includes(texto) ||
            usuario.rol.toLowerCase().includes(texto) ||
            (usuario.dni ?? "").includes(texto)
          );
        }),
    [busqueda, estadoFiltro, usuarios],
  );

  return {
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
  };
};
