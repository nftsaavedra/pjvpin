import React, { useState, useEffect } from "react";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { toast } from "@/services/toast";
import { createGrupo, updateGrupo, getTauriErrorMessage } from "../api";
import type { Grupo } from "../hooks/useGruposTab";

interface GrupoFormModalProps {
  open: boolean;
  onClose: () => void;
  editingGrupo: Grupo | null;
  onDataModified: () => void;
}

export const GrupoFormModal: React.FC<GrupoFormModalProps> = ({
  open,
  onClose,
  editingGrupo,
  onDataModified,
}) => {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    linea: "",
  });
  const [lineas, setLineas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingGrupo) {
      setFormData({
        nombre: editingGrupo.nombre,
        descripcion: editingGrupo.descripcion || "",
        linea: "",
      });
      setLineas([...editingGrupo.lineas_investigacion]);
    } else {
      setFormData({ nombre: "", descripcion: "", linea: "" });
      setLineas([]);
    }
  }, [open, editingGrupo]);

  const handleAddLinea = () => {
    if (formData.linea.trim() && !lineas.includes(formData.linea.trim())) {
      setLineas([...lineas, formData.linea.trim()]);
      setFormData({ ...formData, linea: "" });
    }
  };

  const handleRemoveLinea = (linea: string) => {
    setLineas(lineas.filter((l) => l !== linea));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.warning("Ingrese el nombre del grupo");
      return;
    }

    if (lineas.length === 0) {
      toast.warning("Agregue al menos una línea de investigación");
      return;
    }

    const request = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      coordinador_id: null,
      lineas_investigacion: lineas,
    };

    setIsLoading(true);
    try {
      if (editingGrupo) {
        await updateGrupo(editingGrupo.id_grupo, request);
        toast.success("Grupo actualizado correctamente");
      } else {
        await createGrupo(request);
        toast.success("Grupo creado correctamente");
      }
      onClose();
      onDataModified();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <FormModal
      open={open}
      title={
        <span className="title-with-icon form-card-title">
          <span>{editingGrupo ? "Editar grupo" : "Crear nuevo grupo"}</span>
        </span>
      }
      description="Configure los detalles del grupo de investigación"
      onClose={onClose}
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      submitText={editingGrupo ? "Actualizar grupo" : "Crear grupo"}
      isLoading={isLoading}
      size="lg"
    >
      <FormInput
        label="Nombre del Grupo"
        value={formData.nombre}
        onChange={(value) => {
          setFormData({ ...formData, nombre: value });
        }}
        placeholder="Ej: Grupo de Sostenibilidad Ambiental"
        required
      />

      <div className="form-group">
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => {
            setFormData({ ...formData, descripcion: e.target.value });
          }}
          placeholder="Breve descripción del grupo y sus objetivos"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="linea">Líneas de Investigación</label>
        <div className="flex items-center gap-2">
          <input
            id="linea"
            type="text"
            value={formData.linea}
            onChange={(e) => {
              setFormData({ ...formData, linea: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLinea();
              }
            }}
            placeholder="Ingrese una línea y presione Enter"
          />
          <button type="button" className="btn-secondary" onClick={handleAddLinea}>
            Agregar
          </button>
        </div>

        {lineas.length > 0 && (
          <div className="flex flex-col gap-2">
            {lineas.map((linea) => (
              <div
                key={linea}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-200 bg-white"
              >
                <span>{linea}</span>
                <button
                  type="button"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                  onClick={() => {
                    handleRemoveLinea(linea);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormModal>
  );
};
