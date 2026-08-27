import React, { Suspense, lazy } from "react";
import { FolderOpen, RefreshCw, TrendingUp, TriangleAlert, Users } from "lucide-react";
import {
  getEstadisticasProyectosXInvestigador,
  getKpisDashboard,
  getProyectosTrend,
  getRenacytDistribucion,
  type InvestigadorProyectosCount,
  type KpisDashboard,
  type ProyectosTrendItem,
  type RenacytDistribucionItem,
} from "./api";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { useStableFetchData } from "@/shared/hooks/useStableFetch";
import { AppIcon } from "@/shared/ui/AppIcon";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SkeletonChart, SkeletonKpiGrid } from "@/shared/ui/Skeleton";
import { KPICard } from "./components/KPICard";
import { messages } from "@/shared/feedback/messages";

const DashboardCharts = lazy(async () => {
  const module = await import("./components/DashboardCharts");
  return { default: module.DashboardCharts };
});

const DashboardChartsFallback = () => (
  <>
    <SkeletonChart titleWidth="md" height="lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <SkeletonChart titleWidth="md" height="md" />
      <SkeletonChart titleWidth="md" height="md" />
    </div>
    <SkeletonChart titleWidth="lg" height="md" />
    <SkeletonChart titleWidth="md" height="md" />
  </>
);

interface DashboardTabProps {
  refreshTrigger?: number;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ refreshTrigger = 0 }) => {
  const {
    data: dashboardDataResult,
    loading,
    refreshing,
    error,
    recargar: cargarDatos,
  } = useStableFetchData<{
    kpis: KpisDashboard | null;
    estadisticas: InvestigadorProyectosCount[];
    trend: ProyectosTrendItem[];
    renacyt: RenacytDistribucionItem[];
  }>(
    async () => {
      const [kpisRes, estadisticasRes, trendRes, renacytRes] = await Promise.all([
        getKpisDashboard(),
        getEstadisticasProyectosXInvestigador(),
        getProyectosTrend(),
        getRenacytDistribucion(),
      ]);

      return { kpis: kpisRes, estadisticas: estadisticasRes, trend: trendRes, renacyt: renacytRes };
    },
    refreshTrigger,
    messages.dashboard.loadError,
    { kpis: null, estadisticas: [], trend: [], renacyt: [] },
  );

  useRefreshToast({
    refreshing,
    message: messages.dashboard.actions.refreshing,
    toastKey: "panel-refresh",
    cooldownMs: 120000,
  });

  const { kpis, estadisticas, trend, renacyt } = dashboardDataResult;
  const totalInvestigadores = kpis?.total_investigadores ?? 0;
  const totalProyectos = kpis?.total_proyectos ?? 0;
  const investigadoresConProyectos = estadisticas.filter(
    (investigador) => investigador.cantidad > 0,
  ).length;
  const investigadoresSinProyectos = Math.max(totalInvestigadores - investigadoresConProyectos, 0);
  const promedioProyectos =
    totalInvestigadores > 0 ? (totalProyectos / totalInvestigadores).toFixed(2) : "0.00";
  const mayorCarga = estadisticas.reduce(
    (max, item) => (item.cantidad > max ? item.cantidad : max),
    0,
  );

  if (error && !kpis && estadisticas.length === 0) {
    return (
      <div className="tab-panel">
        <EmptyState
          variant="error"
          message={messages.dashboard.errorCarga}
          actionLabel={messages.ui.reintentar}
          onAction={() => {
            void cargarDatos();
          }}
        />
      </div>
    );
  }

  return (
    <div className="tab-panel dashboard">
      {loading ? (
        <>
          <SkeletonKpiGrid />
          <DashboardChartsFallback />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {kpis && (
              <>
                <KPICard
                  label={messages.dashboard.kpiLabels.totalInvestigadores}
                  value={kpis.total_investigadores}
                  icon={Users}
                />
                <KPICard
                  label={messages.dashboard.kpiLabels.totalProyectos}
                  value={kpis.total_proyectos}
                  icon={FolderOpen}
                />
                <KPICard
                  label={messages.dashboard.kpiLabels.investigadoresSinProyectos}
                  value={investigadoresSinProyectos}
                  icon={TriangleAlert}
                />
                <KPICard
                  label={messages.dashboard.kpiLabels.promedioProyectos}
                  value={promedioProyectos}
                  icon={TrendingUp}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-end mb-4">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void cargarDatos();
              }}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <span className="button-with-icon">
                <AppIcon icon={RefreshCw} size={16} className={refreshing ? "animate-spin" : ""} />
                <span>{messages.dashboard.actions.actualizar}</span>
              </span>
            </button>
          </div>

          <Suspense fallback={<DashboardChartsFallback />}>
            <DashboardCharts
              estadisticas={estadisticas}
              totalInvestigadores={totalInvestigadores}
              totalProyectos={totalProyectos}
              trend={trend}
              renacyt={renacyt}
              mayorCarga={mayorCarga}
              investigadoresConProyectos={investigadoresConProyectos}
            />
          </Suspense>
        </>
      )}
    </div>
  );
};
