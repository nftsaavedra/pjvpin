import React, { useEffect, useMemo, useState } from "react";
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

interface DashboardChartsProps {
  estadisticas: InvestigadorProyectosCount[];
  totalInvestigadores: number;
  totalProyectos: number;
  trend: ProyectosTrendItem[];
  renacyt: RenacytDistribucionItem[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  estadisticas,
  totalInvestigadores,
  totalProyectos,
  trend,
  renacyt,
}) => {
  const trendData = useMemo(
    () =>
      trend.map((t) => ({
        ...t,
        label: `${t.mes.toString().padStart(2, "0")}/${t.anio}`,
      })),
    [trend],
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const totalAsignaciones = useMemo(
    () => estadisticas.reduce((acc, investigador) => acc + investigador.cantidad, 0),
    [estadisticas],
  );
  const hasProjectAssignments = totalAsignaciones > 0;
  const investigadoresConProyectos = useMemo(
    () => estadisticas.filter((investigador) => investigador.cantidad > 0).length,
    [estadisticas],
  );
  const investigadoresSinProyectos = Math.max(totalInvestigadores - investigadoresConProyectos, 0);
  const promedioProyectos =
    totalInvestigadores > 0 ? (totalProyectos / totalInvestigadores).toFixed(2) : "0.00";
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
  const pieColors = ["#10b981", "#f59e0b"];
  const isCompact = viewportWidth <= 768;
  const allInvestigadoresTickInterval = isCompact
    ? Math.max(Math.ceil(estadisticas.length / 6) - 1, 0)
    : 0;
  const [topChartRef, topChart] = useMeasuredChart(320);
  const [distributionChartRef, distributionChart] = useMeasuredChart(280);
  const [pieChartRef, pieChart] = useMeasuredChart(280);
  const [allInvestigadoresChartRef, allInvestigadoresChart] = useMeasuredChart(300);
  const pieHasVisibleData = pieData.some((item) => item.value > 0);
  const showTopRanking = topInvestigadores.length > 0 && hasProjectAssignments;
  const showAllInvestigadores = estadisticas.length > 0 && hasProjectAssignments;
  const chartMargin = useMemo(
    () => ({
      top: 8,
      right: isCompact ? 8 : 20,
      left: isCompact ? -18 : 0,
      bottom: isCompact ? 24 : 8,
    }),
    [isCompact],
  );
  const pieOuterRadius = Math.max(
    Math.min((pieChart.width - (isCompact ? 40 : 72)) / 2, isCompact ? 78 : 98),
    42,
  );
  const chartLoadingState = <SkeletonChart titleWidth="md" height="md" />;

  return (
    <div className="dashboard-charts flex flex-col gap-6">
      <div className="dashboard-main-grid">
        <div className="chart-container mb-0">
          <h2>Top investigadores por cantidad de proyectos</h2>
          <div ref={topChartRef} className="dashboard-chart-stage dashboard-chart-stage-lg">
            {showTopRanking ? (
              topChart.ready ? (
                <BarChart
                  width={topChart.width}
                  height={topChart.height}
                  data={topInvestigadores}
                  margin={chartMargin}
                >
                  <CartesianGrid stroke="#dbe7f5" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    angle={isCompact ? -18 : 0}
                    textAnchor={isCompact ? "end" : "middle"}
                    height={isCompact ? 58 : 40}
                    tick={{ fontSize: isCompact ? 11 : 12, fill: "#64748b" }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="cantidad"
                    fill="#2196F3"
                    name="Cantidad de Proyectos"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              ) : (
                chartLoadingState
              )
            ) : (
              <div className="empty-state">Sin asignaciones para el ranking</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="dashboard-insight-card">
            <span className="dashboard-insight-label">Investigadores con proyectos</span>
            <strong>{investigadoresConProyectos}</strong>
          </div>
          <div className="dashboard-insight-card">
            <span className="dashboard-insight-label">Carga media</span>
            <strong>{promedioProyectos}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="chart-container mb-0">
          <h2>Distribución de carga por investigador</h2>
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
                  margin={chartMargin}
                >
                  <CartesianGrid stroke="#dbe7f5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rango" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="cantidad"
                    fill="#0ea5e9"
                    name="Investigadores"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              ) : (
                chartLoadingState
              )
            ) : (
              <div className="empty-state">Sin datos de distribución</div>
            )}
          </div>
        </div>

        <div className="chart-container">
          <h2>Investigadores con y sin proyectos</h2>
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
                    innerRadius={Math.max(pieOuterRadius - 28, 24)}
                    outerRadius={pieOuterRadius}
                    paddingAngle={pieData.filter((item) => item.value > 0).length > 1 ? 2 : 0}
                    minAngle={pieData.filter((item) => item.value > 0).length > 1 ? 4 : 0}
                    labelLine={false}
                    label={({ name, value }) => (value ? `${name}: ${value}` : "")}
                  >
                    {pieData.map((entry, idx) => (
                      // eslint-disable-next-line @typescript-eslint/no-deprecated
                      <Cell
                        key={`${entry.name}-${idx}`}
                        fill={pieColors[idx % pieColors.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value ?? 0, "Investigadores"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              ) : (
                chartLoadingState
              )
            ) : (
              <div className="empty-state">Sin datos para comparación</div>
            )}
          </div>
        </div>
      </div>

      <div className="chart-container mb-0">
        <h2>Todos los investigadores: proyectos asignados</h2>
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
                margin={chartMargin}
              >
                <CartesianGrid stroke="#dbe7f5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  interval={allInvestigadoresTickInterval}
                  angle={isCompact ? -20 : 0}
                  textAnchor={isCompact ? "end" : "middle"}
                  height={isCompact ? 62 : 40}
                  tick={{ fontSize: isCompact ? 11 : 12, fill: "#64748b" }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="cantidad" fill="#6366f1" name="Cantidad" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              chartLoadingState
            )
          ) : (
            <div className="empty-state">Sin proyectos activos asignados</div>
          )}
        </div>
      </div>

      {/* ── Proyectos por Año (Trend) ── */}
      <div className="chart-container">
        <h2>Proyectos Registrados por Año y Mes</h2>
        {trend.length > 0 ? (
          <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#dbe7f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip
              labelFormatter={(label) => `Periodo: ${label}`}
              formatter={(value) => [`${String(value)} proyectos`, "Cantidad"]}
            />
            <Line
              type="monotone"
              dataKey="cantidad"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
              name="Proyectos"
            />
          </LineChart>
        ) : (
          <div className="empty-state">Sin datos de tendencia disponibles.</div>
        )}
      </div>

      {/* ── Distribución RENACYT ── */}
      <div className="chart-container">
        <h2>Distribución de Investigadores por Nivel RENACYT</h2>
        {renacyt.length > 0 ? (
          <BarChart data={renacyt} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#dbe7f5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nivel" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="con_proyectos"
              fill="#10b981"
              name="Con proyectos"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="sin_proyectos"
              fill="#f59e0b"
              name="Sin proyectos"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        ) : (
          <div className="empty-state">Sin datos de distribucion RENACYT disponibles.</div>
        )}
      </div>
    </div>
  );
};
