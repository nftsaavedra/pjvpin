import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { ConfirmDialog } from "@/shared/overlays/ConfirmDialog";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";

interface RelatedEntity {
  id: string;
  [key: string]: unknown;
}

interface RelatedEntityFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface RelatedEntitiesSectionProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  items: RelatedEntity[];
  fields: RelatedEntityFieldConfig[];
  onItemsChange: (items: RelatedEntity[]) => void;
  renderItem?: (item: RelatedEntity, index: number) => React.ReactNode;
  emptyMessage?: string;
}

export const RelatedEntitiesSection: React.FC<RelatedEntitiesSectionProps> = ({
  title,
  icon,
  description,
  items,
  fields,
  onItemsChange,
  renderItem,
  emptyMessage = messages.proyectos.relatedSection.emptyDefault,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<RelatedEntity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getField = (item: RelatedEntity | null, name: string): string => {
    if (!item) return "";
    const val = item[name];
    return typeof val === "string" ? val : JSON.stringify(val ?? "");
  };

  const handleAddItem = () => {
    const newId = `temp-${Date.now()}`;
    const newItem: RelatedEntity = { id: newId };
    fields.forEach((field) => {
      newItem[field.name] = field.type === "number" ? 0 : "";
    });
    setEditingId(newId);
    setEditingItem(newItem);
  };

  const handleEditItem = (item: RelatedEntity) => {
    setEditingId(item.id);
    setEditingItem({ ...item });
  };

  const handleSaveItem = () => {
    if (!editingItem) return;

    // Validation
    for (const field of fields) {
      if (field.required && !editingItem[field.name]) {
        toast.warning(messages.proyectos.relatedSection.campoRequerido(field.label));
        return;
      }
    }

    const isNew = editingId?.startsWith("temp-");
    if (isNew) {
      const finalId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      onItemsChange([...items, { ...editingItem, id: finalId }]);
    } else {
      const updated = items.map((item) => (item.id === editingId ? editingItem : item));
      onItemsChange(updated);
    }

    setEditingId(null);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteItem = () => {
    if (deleteConfirmId) {
      onItemsChange(items.filter((item) => item.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingItem(null);
  };

  return (
    <>
      <div className="related-entities-section">
        <button
          type="button"
          className="related-entities-toggle"
          onClick={() => {
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
        >
          <span className="related-entities-toggle-copy">
            <span className="title-with-icon">
              {icon}
              <span>{title}</span>
            </span>
            {items.length > 0 && <Badge variant="info">{items.length}</Badge>}
          </span>
          <span className="related-entities-toggle-icon" aria-hidden="true">
            <AppIcon icon={expanded ? ChevronUp : ChevronDown} size={18} />
          </span>
        </button>

        {expanded && description && <p className="related-entities-description">{description}</p>}

        {expanded && items.length === 0 && !editingId && (
          <p className="related-entities-empty">{emptyMessage}</p>
        )}

        {items.length > 0 && !editingId && (
          <div className="related-entities-list">
            {items.map((item, index) =>
              renderItem ? (
                <div key={item.id} className="related-entity-item">
                  {renderItem(item, index)}
                  <div className="related-entity-actions">
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => {
                        handleEditItem(item);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-delete"
                      onClick={() => {
                        handleDeleteItem(item.id);
                      }}
                    >
                      <AppIcon icon={Trash2} size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="related-entity-item">
                  <div className="related-entity-content">
                    {fields.map((field) => (
                      <span key={field.name}>
                        <strong>{field.label}:</strong> {getField(item, field.name)}
                      </span>
                    ))}
                  </div>
                  <div className="related-entity-actions">
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => {
                        handleEditItem(item);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-delete"
                      onClick={() => {
                        handleDeleteItem(item.id);
                      }}
                    >
                      <AppIcon icon={Trash2} size={14} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {editingId && editingItem && (
          <div className="related-entity-form">
            <h4 className="related-entity-form-title">
              {editingId.startsWith("temp-")
                ? messages.proyectos.relatedSection.agregar(title)
                : messages.proyectos.relatedSection.editar(title)}
            </h4>
            {fields.map((field) => (
              <div key={field.name} className="form-group">
                <label htmlFor={`${field.name}-${editingId}`}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={`${field.name}-${editingId}`}
                    value={getField(editingItem, field.name)}
                    onChange={(e) => {
                      setEditingItem({ ...editingItem, [field.name]: e.target.value });
                    }}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === "select" && field.options ? (
                  <select
                    id={`${field.name}-${editingId}`}
                    value={getField(editingItem, field.name)}
                    onChange={(e) => {
                      setEditingItem({ ...editingItem, [field.name]: e.target.value });
                    }}
                  >
                    <option value="">
                      {field.placeholder || messages.proyectos.relatedSection.selectPlaceholder}
                    </option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${field.name}-${editingId}`}
                    type={field.type || "text"}
                    value={getField(editingItem, field.name)}
                    onChange={(e) => {
                      setEditingItem({ ...editingItem, [field.name]: e.target.value });
                    }}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
            <div className="related-entity-form-actions">
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveItem}>
                Guardar
              </button>
            </div>
          </div>
        )}

        {!editingId && (
          <div className="related-entities-add">
            <button type="button" className="btn-secondary" onClick={handleAddItem}>
              <span className="button-with-icon">
                <AppIcon icon={Plus} size={16} />
                <span>{messages.proyectos.relatedSection.botonAgregar(title)}</span>
              </span>
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deleteConfirmId)}
        title={messages.proyectos.relatedSection.eliminarTitle}
        message={messages.proyectos.relatedSection.eliminarMessage}
        confirmText={messages.proyectos.relatedSection.eliminarConfirmText}
        cancelText={messages.ui.cancelar}
        onConfirm={confirmDeleteItem}
        onCancel={() => {
          setDeleteConfirmId(null);
        }}
      />
    </>
  );
};
