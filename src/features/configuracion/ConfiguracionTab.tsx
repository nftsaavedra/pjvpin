import React, { lazy, Suspense, useMemo, useState } from "react";
import { GraduationCap, LibraryBig, Users } from "lucide-react";
import type { Usuario } from "../auth/api";
import { hasPermission } from "@/shared/auth/permissions";
import { SkeletonBlock, SkeletonTable } from "@/shared/ui/Skeleton";
import { TabNavigation, type Tab } from "@/shared/navigation/TabNavigation";

const GradosTab = lazy(async () => {
  const module = await import("./grados/GradosTab");
  return { default: module.GradosTab };
});

const CatalogosPanel = lazy(async () => {
  const module = await import("./catalogos/CatalogosPanel");
  return { default: module.CatalogosPanel };
});

const UsuariosTab = lazy(async () => {
  const module = await import("./usuarios/UsuariosTab");
  return { default: module.UsuariosTab };
});

type ConfigSection = "grados" | "catalogos" | "usuarios";

interface ConfiguracionTabProps {
  currentUser: Usuario | null;
  refreshTrigger?: number;
  isAdmin: boolean;
  onDataModified: () => void;
}

const ConfigSectionFallback = () => (
  <div className="tab-panel">
    <div className="table-container">
      <SkeletonBlock className="skeleton skeleton-line skeleton-title-md" />
      <SkeletonTable columns={5} rows={5} />
    </div>
  </div>
);

export const ConfiguracionTab: React.FC<ConfiguracionTabProps> = ({
  currentUser,
  refreshTrigger = 0,
  isAdmin,
  onDataModified,
}) => {
  const canManageCatalogos = hasPermission(currentUser?.rol, "catalogos.manage");
  const canViewCatalogos = canManageCatalogos;

  const [activeSection, setActiveSection] = useState<ConfigSection>(
    isAdmin ? "usuarios" : "grados",
  );

  const effectiveSection = useMemo<ConfigSection>(() => {
    if (!isAdmin && activeSection === "usuarios") return "grados";
    if (!canViewCatalogos && activeSection === "catalogos") return "grados";
    return activeSection;
  }, [activeSection, canViewCatalogos, isAdmin]);

  const sections: Tab[] = [
    {
      id: "grados",
      label: "Grados",
      icon: GraduationCap,
      description: "Catálogo académico base para el sistema.",
    },
    ...(canViewCatalogos
      ? [
          {
            id: "catalogos",
            label: "Catálogos",
            icon: LibraryBig,
            description: "Tipos de patentes, productos, financiamiento y monedas.",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: "usuarios",
            label: "Usuarios",
            icon: Users,
            description: "Altas, bajas y permisos de acceso al sistema.",
          },
        ]
      : []),
  ];

  const visibleSections = sections.filter((section) =>
    section.id === "usuarios" ? isAdmin : section.id === "catalogos" ? canViewCatalogos : true,
  );

  const handleSectionChange = (sectionId: string) => {
    if (sectionId === "grados" || sectionId === "catalogos" || sectionId === "usuarios") {
      setActiveSection(sectionId);
    }
  };

  const panelId = `config-panel-${effectiveSection}`;

  return (
    <div className="tab-panel">
      <div className="settings-shell">
        <TabNavigation
          tabs={visibleSections}
          activeTab={effectiveSection}
          onTabChange={handleSectionChange}
          variant="settings"
          ariaLabel="Secciones de configuración"
        />

        {visibleSections.length === 0 ? (
          <div className="empty-state">
            <p>No tiene permisos para acceder a ninguna sección de configuración.</p>
          </div>
        ) : (
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`config-tab-${effectiveSection}`}
            className="settings-content settings-content-panel"
          >
            <Suspense fallback={<ConfigSectionFallback />}>
              {effectiveSection === "grados" && (
                <GradosTab onGradoModified={onDataModified} refreshTrigger={refreshTrigger} />
              )}

              {effectiveSection === "catalogos" && canViewCatalogos && currentUser && (
                <CatalogosPanel
                  canManage={canManageCatalogos}
                  onDataModified={onDataModified}
                  refreshTrigger={refreshTrigger}
                />
              )}

              {effectiveSection === "usuarios" && isAdmin && currentUser && (
                <UsuariosTab
                  currentUser={currentUser}
                  onUsuarioModified={onDataModified}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};
