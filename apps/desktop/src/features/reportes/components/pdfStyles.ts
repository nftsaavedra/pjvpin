import { StyleSheet } from "@react-pdf/renderer";

export const pdfDefaults = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#14213d" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0b1f33", marginBottom: 6 },
  subtitle: { fontSize: 10, color: "#4a5d75", marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#16324f",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#d7e3f1",
    paddingBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d7e3f1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  row: { flexDirection: "row" },
  headerRow: { backgroundColor: "#16324f" },
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: "#d7e3f1",
    justifyContent: "center",
  },
  headerCellText: { color: "#fff", fontSize: 7, fontFamily: "Helvetica-Bold" },
  cellText: { color: "#14213d", fontSize: 7 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 120, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#4a5d75" },
  infoValue: { fontSize: 8, color: "#14213d", flex: 1 },
});
