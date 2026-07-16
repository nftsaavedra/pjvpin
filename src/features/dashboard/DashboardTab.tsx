import React, { Suspense, lazy } from "react";
import { FolderOpen, RotateCcw, TrendingUp, TriangleAlert, Users } from "lucide-react";
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
import { SkeletonChart, SkeletonKpiGrid } from "@/shared/ui/Skeleton";
import { KPICard } from "./components/KPICard";

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
    data: dashboardData,
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
    "Error al cargar datos del dashboard",
    { kpis: null, estadisticas: [], trend: [], renacyt: [] },
  );

  useRefreshToast({
    refreshing,
    message: "Actualizando indicadores del dashboard",
    toastKey: "dashboard-refresh",
    cooldownMs: 120000,
  });

  const { kpis, estadisticas, trend, renacyt } = dashboardData;
  const totalInvestigadores = kpis?.total_investigadores ?? 0;
  const totalProyectos = kpis?.total_proyectos ?? 0;
  const investigadoresConProyectos = estadisticas.filter(
    (investigador) => investigador.cantidad > 0,
  ).length;
  const investigadoresSinProyectos = Math.max(totalInvestigadores - investigadoresConProyectos, 0);
  const promedioProyectos =
    totalInvestigadores > 0 ? (totalProyectos / totalInvestigadores).toFixed(2) : "0.00";

  if (error && !kpis && estadisticas.length === 0) {
    return (
      <div className="tab-panel error">
        <p>{error}</p>
        <button onClick={() => void cargarDatos()}>
          <span className="button-with-icon">
            <AppIcon icon={RotateCcw} size={16} />
            <span>Reintentar</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="tab-panel dashboard">
      {error && !loading && (
        <div className="inline-feedback inline-feedback-warning">
          <span>No se pudo refrescar el dashboard. Se mantienen los indicadores anteriores.</span>
          <button type="button" className="btn-secondary" onClick={() => void cargarDatos()}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <>
          <SkeletonKpiGrid />
          <DashboardChartsFallback />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpis && (
              <>
                <KPICard
                  label="Total Investigadores"
                  value={kpis.total_investigadores}
                  icon={Users}
                />
                <KPICard label="Total Proyectos" value={kpis.total_proyectos} icon={FolderOpen} />
                <KPICard
                  label="Investigadores Sin Proyectos"
                  value={investigadoresSinProyectos}
                  icon={TriangleAlert}
                />
                <KPICard
                  label="Promedio Proyectos/Investigador"
                  value={promedioProyectos}
                  icon={TrendingUp}
                />
              </>
            )}
          </div>

          <Suspense fallback={<DashboardChartsFallback />}>
            <DashboardCharts
              estadisticas={estadisticas}
              totalInvestigadores={totalInvestigadores}
              totalProyectos={totalProyectos}
              trend={trend}
              renacyt={renacyt}
            />
          </Suspense>

          <button className="btn-secondary ml-auto" onClick={() => void cargarDatos()}>
            Actualizar
          </button>
        </>
      )}
    </div>
  );
};
