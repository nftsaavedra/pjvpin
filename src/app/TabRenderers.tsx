import { Suspense } from "react";
import { hasPermission } from "@/shared/auth/permissions";
import {
  DashboardFallback,
  FormAndTableFallback,
  TableOnlyFallback,
} from "@/shared/ui/SkeletonFallbacks";
import { ErrorBoundary } from "@/shared/feedback/ErrorBoundary";
import { type Usuario } from "@/features/auth/api";
import {
  DashboardTab,
  ProyectosTab,
  GruposTab,
  DocenteCreateModal,
  DocentesTable,
  ReportesTab,
  ConfiguracionTab,
} from "@/app/lazyImports";

interface TabRenderersProps {
  validActiveTab: string;
  currentUser: Usuario | null;
  currentRole: string | null;
  refreshTrigger: number;
  onDataModified: () => void;
  docenteFormOpen: boolean;
  setDocenteFormOpen: (open: boolean) => void;
}

export function TabRenderers({
  validActiveTab,
  currentUser,
  currentRole,
  refreshTrigger,
  onDataModified,
  docenteFormOpen,
  setDocenteFormOpen,
}: TabRenderersProps) {
  if (!currentUser) {
    return null;
  }

  switch (validActiveTab) {
    case "dashboard":
      return (
        <ErrorBoundary fallbackTitle="Error en Dashboard">
          <Suspense fallback={<DashboardFallback />}>
            <DashboardTab refreshTrigger={refreshTrigger} />
          </Suspense>
        </ErrorBoundary>
      );
    case "proyectos":
      return (
        <ErrorBoundary fallbackTitle="Error en Proyectos">
          <Suspense fallback={<FormAndTableFallback columns={5} />}>
            <ProyectosTab
              canManage={hasPermission(currentRole, "proyectos.manage")}
              onProyectoCreated={onDataModified}
              refreshTrigger={refreshTrigger}
            />
          </Suspense>
        </ErrorBoundary>
      );
    case "docentes":
      return (
        <ErrorBoundary fallbackTitle="Error en Docentes">
          <Suspense fallback={<FormAndTableFallback columns={6} />}>
            <div className="module-shell docentes-module">
              <DocentesTable
                canManage={hasPermission(currentRole, "docentes.manage")}
                onCreateClick={() => {
                  setDocenteFormOpen(true);
                }}
                refreshTrigger={refreshTrigger}
              />
              {docenteFormOpen && hasPermission(currentRole, "docentes.manage") && (
                <Suspense fallback={null}>
                  <DocenteCreateModal
                    open={docenteFormOpen}
                    onClose={() => {
                      setDocenteFormOpen(false);
                    }}
                    onDocenteCreated={onDataModified}
                    refreshTrigger={refreshTrigger}
                  />
                </Suspense>
              )}
            </div>
          </Suspense>
        </ErrorBoundary>
      );
    case "grupos":
      return (
        <ErrorBoundary fallbackTitle="Error en Grupos">
          <Suspense fallback={<FormAndTableFallback columns={4} />}>
            <GruposTab canManage={hasPermission(currentRole, "grupos.manage")} />
          </Suspense>
        </ErrorBoundary>
      );
    case "configuracion":
      if (!hasPermission(currentRole, "configuracion.view")) {
        return null;
      }

      return (
        <ErrorBoundary fallbackTitle="Error en Configuracion">
          <Suspense fallback={<FormAndTableFallback columns={5} />}>
            <ConfiguracionTab
              currentUser={currentUser}
              onDataModified={onDataModified}
              refreshTrigger={refreshTrigger}
              isAdmin={hasPermission(currentRole, "usuarios.manage")}
            />
          </Suspense>
        </ErrorBoundary>
      );
    case "reportes":
      return (
        <ErrorBoundary fallbackTitle="Error en Reportes">
          <Suspense fallback={<TableOnlyFallback columns={5} />}>
            <ReportesTab
              canExport={hasPermission(currentRole, "reportes.export")}
              refreshTrigger={refreshTrigger}
            />
          </Suspense>
        </ErrorBoundary>
      );
    default:
      return null;
  }
}
