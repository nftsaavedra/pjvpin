import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import type { ReporteProyectoIntegral, ReporteInvestigadorIntegral } from "../api";
import { formatArray, formatBool, formatTimestamp } from "./pdfFormatters";
import { pdfDefaults } from "./pdfStyles";

export interface SectionHeaderProps {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ label, count, open, onToggle }) => (
  <summary
    style={{
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      backgroundColor: "var(--color-surface-alt, #f4f8fb)",
      borderRadius: "6px",
      marginBottom: open ? "0.5rem" : 0,
    }}
    onClick={(e) => {
      e.preventDefault();
      onToggle();
    }}
  >
    <AppIcon icon={open ? ChevronDown : ChevronRight} size={16} />
    <strong>{label}</strong>
    {count != null && <Badge variant="info">{count}</Badge>}
  </summary>
);

export interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  minWidth?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, minWidth = "160px" }) => (
  <div style={{ display: "flex", marginBottom: "0.35rem" }}>
    <span style={{ fontWeight: 600, minWidth, color: "var(--color-text-soft, #60758d)" }}>
      {label}:
    </span>
    <span>{value}</span>
  </div>
);

export interface PdfTableProps {
  columns: string[];
  widths: string[];
  rows: string[][];
}

export const PdfTable: React.FC<PdfTableProps> = ({ columns, widths, rows }) => (
  <View style={pdfDefaults.table}>
    <View style={[pdfDefaults.row, pdfDefaults.headerRow]} fixed>
      {columns.map((col, i) => (
        <View
          key={col}
          style={[
            pdfDefaults.cell,
            { width: widths[i] },
            i === columns.length - 1 ? { borderRightWidth: 0 } : {},
          ]}
        >
          <Text style={pdfDefaults.headerCellText}>{col}</Text>
        </View>
      ))}
    </View>
    {rows.map((row, ri) => (
      <View key={ri} style={pdfDefaults.row} wrap={false}>
        {row.map((cell, ci) => (
          <View
            key={ci}
            style={[
              pdfDefaults.cell,
              { width: widths[ci] },
              ci === columns.length - 1 ? { borderRightWidth: 0 } : {},
            ]}
          >
            <Text style={pdfDefaults.cellText}>{cell}</Text>
          </View>
        ))}
      </View>
    ))}
    {rows.length === 0 && (
      <View style={[pdfDefaults.row, { padding: 10 }]}>
        <Text style={pdfDefaults.cellText}>Sin datos</Text>
      </View>
    )}
  </View>
);

export const ProyectoIntegralPdf = ({ report }: { report: ReporteProyectoIntegral }) => {
  const {
    cabecera,
    equipo,
    patentes,
    productos,
    equipamientos,
    financiamientos,
    resumen_financiero,
  } = report;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfDefaults.page}>
        <Text style={pdfDefaults.title}>Reporte Integral de Proyecto</Text>
        <Text style={pdfDefaults.subtitle}>{cabecera.titulo_proyecto}</Text>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Cabecera</Text>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>ID Proyecto:</Text>
            <Text style={pdfDefaults.infoValue}>{cabecera.id_proyecto}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Activo:</Text>
            <Text style={pdfDefaults.infoValue}>{formatBool(cabecera.activo)}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Campo OCDE:</Text>
            <Text style={pdfDefaults.infoValue}>{cabecera.campo_ocde ?? "-"}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Programas:</Text>
            <Text style={pdfDefaults.infoValue}>
              {formatArray(cabecera.programas_relacionados)}
            </Text>
          </View>
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Equipo ({report.total_investigadores})</Text>
          <PdfTable
            columns={[
              "Investigador",
              "DNI",
              "Grado",
              "RENACYT",
              "Nivel",
              "Grupo",
              "Resp.",
              "Pubs.",
            ]}
            widths={["17%", "12%", "12%", "15%", "10%", "12%", "10%", "12%"]}
            rows={equipo.map((m) => [
              m.nombres_apellidos,
              m.dni,
              m.grado_nombre,
              m.renacyt_codigo_registro ?? "-",
              m.renacyt_nivel ?? "-",
              m.grupo_nombre ?? "-",
              formatBool(m.es_responsable),
              String(m.publicaciones_count),
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Patentes ({report.total_patentes})</Text>
          <PdfTable
            columns={["Título", "N° Patente", "Tipo", "Estado", "País", "F. Solicitud"]}
            widths={["24%", "15%", "14%", "14%", "13%", "20%"]}
            rows={patentes.map((p) => [
              p.titulo,
              p.numero_patente ?? "-",
              p.tipo_nombre ?? "-",
              p.estado_nombre ?? "-",
              p.pais ?? "-",
              formatTimestamp(p.fecha_solicitud),
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Productos ({report.total_productos})</Text>
          <PdfTable
            columns={["Nombre", "Tipo", "Etapa", "F. Registro"]}
            widths={["40%", "22%", "18%", "20%"]}
            rows={productos.map((p) => [
              p.nombre,
              p.tipo_nombre ?? "-",
              p.etapa_nombre ?? "-",
              formatTimestamp(p.fecha_registro),
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Equipamientos ({report.total_equipamientos})</Text>
          <PdfTable
            columns={["Nombre", "Valor Est.", "Moneda", "Proveedor", "F. Adquisición"]}
            widths={["28%", "20%", "14%", "20%", "18%"]}
            rows={equipamientos.map((e) => [
              e.nombre,
              e.valor_estimado != null ? String(e.valor_estimado) : "-",
              e.moneda_nombre ?? "-",
              e.proveedor ?? "-",
              formatTimestamp(e.fecha_adquisicion),
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>
            Financiamiento ({report.total_financiamientos})
          </Text>
          <PdfTable
            columns={["Entidad", "Tipo", "Monto", "Moneda", "Estado", "F. Inicio", "F. Fin"]}
            widths={["20%", "14%", "12%", "11%", "15%", "14%", "14%"]}
            rows={financiamientos.map((f) => [
              f.entidad_financiadora,
              f.tipo_nombre ?? "-",
              f.monto != null ? String(f.monto) : "-",
              f.moneda_nombre ?? "-",
              f.estado_financiero_nombre ?? "-",
              formatTimestamp(f.fecha_inicio),
              formatTimestamp(f.fecha_fin),
            ])}
          />
          <Text style={{ ...pdfDefaults.sectionTitle, marginTop: 10 }}>Resumen Financiero</Text>
          <Text style={pdfDefaults.infoValue}>
            Total financiamientos: {resumen_financiero.total_financiamientos}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const InvestigadorIntegralPdf = ({ report }: { report: ReporteInvestigadorIntegral }) => {
  const { perfil, proyectos, recursos, publicaciones, trazabilidad } = report;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfDefaults.page}>
        <Text style={pdfDefaults.title}>Reporte Integral de Investigador</Text>
        <Text style={pdfDefaults.subtitle}>{perfil.nombres_apellidos}</Text>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Perfil</Text>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>DNI:</Text>
            <Text style={pdfDefaults.infoValue}>{perfil.dni}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Grado:</Text>
            <Text style={pdfDefaults.infoValue}>{perfil.grado_nombre}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>RENACYT Nivel:</Text>
            <Text style={pdfDefaults.infoValue}>{perfil.renacyt_nivel ?? "-"}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Grupo:</Text>
            <Text style={pdfDefaults.infoValue}>{perfil.grupo_nombre ?? "-"}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>ORCID:</Text>
            <Text style={pdfDefaults.infoValue}>{perfil.renacyt_orcid ?? "-"}</Text>
          </View>
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Proyectos ({report.total_proyectos})</Text>
          <PdfTable
            columns={["Proyecto", "Responsable", "Activo", "OCDE", "Colegas", "Recursos"]}
            widths={["30%", "12%", "8%", "14%", "22%", "14%"]}
            rows={proyectos.map((p) => [
              p.titulo_proyecto,
              formatBool(p.es_responsable),
              formatBool(p.activo),
              p.campo_ocde ?? "-",
              p.colegas.map((c) => c.nombres_apellidos).join("; ") || "-",
              `P:${p.recursos_en_proyecto.patentes} PR:${p.recursos_en_proyecto.productos} E:${p.recursos_en_proyecto.equipamientos} F:${p.recursos_en_proyecto.financiamientos}`,
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>
            Recursos (P:{recursos.total_patentes} | PR:{recursos.total_productos} | E:
            {recursos.total_equipamientos})
          </Text>
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Publicaciones ({report.total_publicaciones})</Text>
          <PdfTable
            columns={["Título", "Tipo", "DOI", "Año", "Journal", "ISSN"]}
            widths={["30%", "16%", "18%", "6%", "18%", "12%"]}
            rows={publicaciones.map((p) => [
              p.titulo,
              p.tipo_publicacion ?? "-",
              p.doi ?? "-",
              p.anio_publicacion != null ? String(p.anio_publicacion) : "-",
              p.journal_titulo ?? "-",
              p.issn ?? "-",
            ])}
          />
        </View>

        <View>
          <Text style={pdfDefaults.sectionTitle}>Trazabilidad</Text>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Actualizado:</Text>
            <Text style={pdfDefaults.infoValue}>{formatTimestamp(trazabilidad.updated_at)}</Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Sinc. RENACYT:</Text>
            <Text style={pdfDefaults.infoValue}>
              {formatTimestamp(trazabilidad.fecha_ultima_sincronizacion_renacyt)}
            </Text>
          </View>
          <View style={pdfDefaults.infoRow}>
            <Text style={pdfDefaults.infoLabel}>Sinc. Pure:</Text>
            <Text style={pdfDefaults.infoValue}>
              {formatTimestamp(trazabilidad.fecha_ultima_sincronizacion_pure)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
