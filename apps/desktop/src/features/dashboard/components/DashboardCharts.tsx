import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  InvestigadorProyectosCount,
  ProyectosTrendItem,
  RenacytDistribucionItem,
} from "../api";
import { useMeasuredChart } from "../hooks/useMeasuredChart";
import { SkeletonChart } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { chartPalette } from "../chartPalette";
import { messages } from "@/shared/feedback/messages";

interface DashboardChartsProps {
  estadisticas: InvestigadorProyectosCount[];
  totalInvestigadores: number;
  totalProyectos: number;
  trend: ProyectosTrendItem[];
  renacyt: RenacytDistribucionItem[];
  mayorCarga: number;
  investigadoresConProyectos: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  estadisticas,
  totalInvestigadores,
  trend,
  renacyt,
  mayorCarga,
  investigadoresConProyectos,
}) => {
  const trendData = useMemo(
    () =>
      trend.map((t) => ({
        ...t,
        label: `${t.mes.toString().padStart(2, "0")}/${t.anio}`,
      })),
    [trend],
  );

  const totalAsignaciones = useMemo(
    () => estadisticas.reduce((acc, investigador) => acc + investigador.cantidad, 0),
    [estadisticas],
  );
  const hasProjectAssignments = totalAsignaciones > 0;
  const investigadoresSinProyectos = Math.max(totalInvestigadores - investigadoresConProyectos, 0);
  const topInvestigadores = useMemo(
    () =>
      [...estadisticas]
        .filter((investigador) => investigador.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8),
    [estadisticas],
  );
  const distribucion = useMemo(
    () => [
      { rango: "0", cantidad: estadisticas.filter((item) => item.cantidad === 0).length },
      { rango: "1", cantidad: estadisticas.filter((item) => item.cantidad === 1).length },
      { rango: "2", cantidad: estadisticas.filter((item) => item.cantidad === 2).length },
      { rango: "3+", cantidad: estadisticas.filter((item) => item.cantidad >= 3).length },
    ],
    [estadisticas],
  );
  const distribucionConDatos = distribucion.filter((item) => item.cantidad > 0);
  const pieData = useMemo(
    () => [
      { name: "Con proyectos", value: investigadoresConProyectos },
      { name: "Sin proyectos", value: investigadoresSinProyectos },
    ],
    [investigadoresConProyectos, investigadoresSinProyectos],
  );
  const showTopRanking = topInvestigadores.length > 0 && hasProjectAssignments;
  const showAllInvestigadores = estadisticas.length > 0 && hasProjectAssignments;
  const porcentajeConProyectos =
    totalInvestigadores > 0
      ? Math.round((investigadoresConProyectos / totalInvestigadores) * 100)
      : 0;

  const [topChartRef, topChart] = useMeasuredChart(320);
  const [distributionChartRef, distributionChart] = useMeasuredChart(280);
  const [pieChartRef, pieChart] = useMeasuredChart(280);
  const [allInvestigadoresChartRef, allInvestigadoresChart] = useMeasuredChart(300);
  const pieHasVisibleData = pieData.some((item) => item.value > 0);
  const chartLoadingState = <SkeletonChart titleWidth="md" height="md" />;

  return (
    <div className="dashboard-charts flex flex-col gap-6">
      <section aria-labelledby="panel-section-carga" className="flex flex-col gap-4">
        <h2 id="panel-section-carga" className="sr-only">
          Carga de trabajo
        </h2>

        <div className="dashboard-main-grid">
          <figure
            className="chart-container mb-0"
            role="img"
            aria-labelledby="chart-top-ranking-title"
          >
            <h3 id="chart-top-ranking-title">Top investigadores por proyectos</h3>
            <div ref={topChartRef} className="dashboard-chart-stage dashboard-chart-stage-lg">
              {showTopRanking ? (
                topChart.ready ? (
                  <BarChart
                    width={topChart.width}
                    height={topChart.height}
                    data={topInvestigadores}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke={chartPalette.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="nombre"
                      interval={0}
                      tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                    />
                    <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                    <Bar
                      dataKey="cantidad"
                      fill={chartPalette.primary}
                      name="Proyectos"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  chartLoadingState
                )
              ) : (
                <EmptyState
                  variant="empty"
                  message={messages.dashboard.chartEmptyMessages.rankingAsignaciones}
                />
              )}
            </div>
          </figure>

          <div className="flex flex-col gap-4 min-w-0">
            <div className="dashboard-insight-card">
              <span className="dashboard-insight-label">
                {messages.dashboard.insightLabels.porcentajeConProyectos}
              </span>
              <strong>{porcentajeConProyectos}%</strong>
            </div>
            <div className="dashboard-insight-card">
              <span className="dashboard-insight-label">Mayor carga</span>
              <strong>{messages.dashboard.insightLabels.mayorCarga(mayorCarga)}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <figure
            className="chart-container mb-0"
            role="img"
            aria-labelledby="chart-distribucion-title"
          >
            <h3 id="chart-distribucion-title">Distribución de carga por investigador</h3>
            <div
              ref={distributionChartRef}
              className="dashboard-chart-stage dashboard-chart-stage-md"
            >
              {distribucionConDatos.length > 0 ? (
                distributionChart.ready ? (
                  <BarChart
                    width={distributionChart.width}
                    height={distributionChart.height}
                    data={distribucionConDatos}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke={chartPalette.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="rango" tick={{ fontSize: 12, fill: chartPalette.textMuted }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                    />
                    <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                    <Bar
                      dataKey="cantidad"
                      fill={chartPalette.seriesInfo}
                      name="Investigadores"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  chartLoadingState
                )
              ) : (
                <EmptyState
                  variant="empty"
                  message={messages.dashboard.chartEmptyMessages.distribucion}
                />
              )}
            </div>
          </figure>

          <figure className="chart-container" role="img" aria-labelledby="chart-pie-title">
            <h3 id="chart-pie-title">Investigadores con y sin proyectos</h3>
            <div ref={pieChartRef} className="dashboard-chart-stage dashboard-chart-stage-md">
              {pieHasVisibleData ? (
                pieChart.ready ? (
                  <PieChart width={pieChart.width} height={pieChart.height}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={Math.max(pieChart.width / 2 - 60, 24)}
                      outerRadius={Math.max(pieChart.width / 2 - 24, 42)}
                      paddingAngle={pieData.filter((item) => item.value > 0).length > 1 ? 2 : 0}
                      minAngle={pieData.filter((item) => item.value > 0).length > 1 ? 4 : 0}
                      labelLine={false}
                      label={({ name, value }) => (value ? `${name}: ${value}` : "")}
                    >
                      {pieData.map((entry, idx) => (
                        // eslint-disable-next-line @typescript-eslint/no-deprecated
                        <Cell
                          key={`${entry.name}-${idx}`}
                          fill={[chartPalette.secondary, chartPalette.warning][idx % 2]}
                          stroke={chartPalette.surface}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value ?? 0, "Investigadores"]} />
                  </PieChart>
                ) : (
                  chartLoadingState
                )
              ) : (
                <EmptyState
                  variant="empty"
                  message={messages.dashboard.chartEmptyMessages.comparacion}
                />
              )}
            </div>
          </figure>
        </div>

        <figure className="chart-container mb-0" role="img" aria-labelledby="chart-todos-title">
          <h3 id="chart-todos-title">Todos los investigadores: proyectos asignados</h3>
          <div
            ref={allInvestigadoresChartRef}
            className="dashboard-chart-stage dashboard-chart-stage-lg"
          >
            {showAllInvestigadores ? (
              allInvestigadoresChart.ready ? (
                <BarChart
                  width={allInvestigadoresChart.width}
                  height={allInvestigadoresChart.height}
                  data={estadisticas}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke={chartPalette.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="nombre"
                    interval={Math.max(Math.ceil(estadisticas.length / 6) - 1, 0)}
                    tick={{ fontSize: 11, fill: chartPalette.textMuted }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                  />
                  <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                  <Bar
                    dataKey="cantidad"
                    fill={chartPalette.seriesAccent}
                    name="Cantidad"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              ) : (
                chartLoadingState
              )
            ) : (
              <EmptyState
                variant="empty"
                message={messages.dashboard.chartEmptyMessages.proyectosActivos}
              />
            )}
          </div>
        </figure>
      </section>

      <section aria-labelledby="panel-section-evolucion" className="flex flex-col gap-4">
        <h2 id="panel-section-evolucion" className="sr-only">
          Evolución
        </h2>

        <figure className="chart-container" role="img" aria-labelledby="chart-trend-title">
          <h3 id="chart-trend-title">Proyectos registrados por año y mes</h3>
          {trend.length > 0 ? (
            <div className="dashboard-chart-stage dashboard-chart-stage-md">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid
                    stroke={chartPalette.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartPalette.textMuted }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                  />
                  <Tooltip
                    labelFormatter={(label) => {
                      const safeLabel =
                        typeof label === "string" || typeof label === "number" ? String(label) : "";
                      return `Periodo: ${safeLabel}`;
                    }}
                    formatter={(value) => [`${String(value)} proyectos`, "Cantidad"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cantidad"
                    stroke={chartPalette.primary}
                    strokeWidth={2}
                    dot={{ r: 3, fill: chartPalette.primary }}
                    name="Proyectos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState variant="empty" message={messages.dashboard.chartEmptyMessages.tendencia} />
          )}
        </figure>
      </section>

      <section aria-labelledby="panel-section-composicion" className="flex flex-col gap-4">
        <h2 id="panel-section-composicion" className="sr-only">
          Composición
        </h2>

        <figure className="chart-container" role="img" aria-labelledby="chart-renacyt-title">
          <h3 id="chart-renacyt-title">Distribución de investigadores por nivel RENACYT</h3>
          {renacyt.length > 0 ? (
            <div className="dashboard-chart-stage dashboard-chart-stage-md">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={renacyt} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid
                    stroke={chartPalette.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="nivel" tick={{ fontSize: 12, fill: chartPalette.textMuted }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: chartPalette.textMuted }}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="con_proyectos"
                    fill={chartPalette.secondary}
                    name="Con proyectos"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="sin_proyectos"
                    fill={chartPalette.warning}
                    name="Sin proyectos"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              variant="empty"
              message={messages.dashboard.chartEmptyMessages.distribucionRenacyt}
            />
          )}
        </figure>
      </section>
    </div>
  );
};
