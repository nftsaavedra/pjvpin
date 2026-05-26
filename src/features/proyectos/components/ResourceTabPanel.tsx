import React, { useState } from "react";
import { Beaker, DollarSign, Lightbulb, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { RelatedEntitiesSection } from "./RelatedEntitiesSection";
import type { RelatedEntity } from "./relatedEntity";
import type { CatalogosProyectos } from "../hooks/useCatalogosProyectos";

type ResourceTab = "patentes" | "productos" | "equipamiento" | "financiamiento";

interface ResourceTabDef {
  id: ResourceTab;
  label: string;
  icon: LucideIcon;
}

const RESOURCE_TABS: ResourceTabDef[] = [
  { id: "patentes", label: "Patentes", icon: Beaker },
  { id: "productos", label: "Productos I+D+i", icon: Lightbulb },
  { id: "equipamiento", label: "Equipamiento", icon: Package },
  { id: "financiamiento", label: "Financiamiento", icon: DollarSign },
];

interface ResourceTabPanelProps {
  catalogos: CatalogosProyectos;
  patentes: RelatedEntity[];
  productos: RelatedEntity[];
  equipamientos: RelatedEntity[];
  financiamientos: RelatedEntity[];
  onPatentesChange: (items: RelatedEntity[]) => void;
  onProductosChange: (items: RelatedEntity[]) => void;
  onEquipamientosChange: (items: RelatedEntity[]) => void;
  onFinanciamientosChange: (items: RelatedEntity[]) => void;
}

export const ResourceTabPanel: React.FC<ResourceTabPanelProps> = ({
  catalogos,
  patentes,
  productos,
  equipamientos,
  financiamientos,
  onPatentesChange,
  onProductosChange,
  onEquipamientosChange,
  onFinanciamientosChange,
}) => {
  const [activeTab, setActiveTab] = useState<ResourceTab>("patentes");

  return (
    <div className="screen-section">
      <div className="screen-section-header">
        <span className="screen-section-title">Entidades relacionadas</span>
      </div>
      <p className="screen-section-description">
        Agregue patentes, productos, equipamiento y financiamiento asociados al proyecto.
      </p>

      <div className="screen-tabs">
        {RESOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`screen-tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id); }}
          >
            <AppIcon icon={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "patentes" && (
        <RelatedEntitiesSection
          title="Patentes"
          icon={<AppIcon icon={Beaker} size={18} />}
          description="Agregue patentes asociadas con este proyecto (opcional)."
          items={patentes}
          fields={[
            {
              name: "numero_patente",
              label: "Número de Patente",
              placeholder: "Ej: PE-2024-00123",
              required: true,
            },
            {
              name: "titulo_patente",
              label: "Título",
              placeholder: "Ej: Proceso de purificación de agua",
              required: true,
            },
            {
              name: "estado",
              label: "Estado",
              type: "select",
              options: catalogos.estadoPatente,
              required: false,
            },
          ]}
          onItemsChange={onPatentesChange}
        />
      )}

      {activeTab === "productos" && (
        <RelatedEntitiesSection
          title="Productos I+D+i"
          icon={<AppIcon icon={Lightbulb} size={18} />}
          description="Agregue productos innovadores del proyecto (opcional)."
          items={productos}
          fields={[
            {
              name: "nombre_producto",
              label: "Nombre del Producto",
              placeholder: "Ej: Sistema de tratamiento",
              required: true,
            },
            {
              name: "descripcion",
              label: "Descripción",
              placeholder: "Breve descripción del producto",
              type: "textarea",
              required: false,
            },
            {
              name: "etapa",
              label: "Etapa de Desarrollo",
              type: "select",
              options: catalogos.etapaProducto,
              required: false,
            },
          ]}
          onItemsChange={onProductosChange}
        />
      )}

      {activeTab === "equipamiento" && (
        <RelatedEntitiesSection
          title="Equipamiento"
          icon={<AppIcon icon={Package} size={18} />}
          description="Agregue equipamiento adquirido o desarrollado (opcional)."
          items={equipamientos}
          fields={[
            {
              name: "nombre_equipo",
              label: "Nombre del Equipo",
              placeholder: "Ej: Cromatógrafo de gases",
              required: true,
            },
            {
              name: "especificaciones",
              label: "Especificaciones",
              placeholder: "Detalles técnicos",
              type: "textarea",
              required: false,
            },
            {
              name: "costo",
              label: "Costo Estimado (S/)",
              type: "number",
              placeholder: "0.00",
              required: false,
            },
          ]}
          onItemsChange={onEquipamientosChange}
        />
      )}

      {activeTab === "financiamiento" && (
        <RelatedEntitiesSection
          title="Financiamiento"
          icon={<AppIcon icon={DollarSign} size={18} />}
          description="Agregue fuentes de financiamiento del proyecto (opcional)."
          items={financiamientos}
          fields={[
            {
              name: "fuente",
              label: "Tipo de Financiamiento",
              type: "select",
              options: catalogos.tipoFinanciamiento,
              required: true,
            },
            {
              name: "monto",
              label: "Monto (S/)",
              type: "number",
              placeholder: "0.00",
              required: false,
            },
            {
              name: "estado_financiero",
              label: "Estado",
              type: "select",
              options: catalogos.estadoFinanciero,
              required: false,
            },
          ]}
          onItemsChange={onFinanciamientosChange}
        />
      )}
    </div>
  );
};
