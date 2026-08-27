import React, { useMemo, useId } from "react";
import { FieldHelpTooltip } from "./FieldHelpTooltip";
import { inputClassName } from "./inputClassName";
import { ui } from "@/shared/feedback/messages";
import { geo as geoMsg } from "@/shared/feedback/messages";
import { useStableFetch } from "@/shared/hooks/useStableFetch";
import { obtenerUbigeos } from "@/shared/tauri/geo";
import type { Ubigeo } from "@/shared/tauri/types";

interface UbigeoSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  help?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Selector de ubigeo en cascada (departamento → provincia → distrito).
 * El `value` es el código INEI completo de 6 dígitos (ej: "150101").
 * Carga todos los ubigeos una sola vez y filtra client-side.
 */
export const UbigeoSelect: React.FC<UbigeoSelectProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  help,
  containerClassName,
}) => {
  const { data: ubigeos, loading } = useStableFetch<Ubigeo[]>(
    obtenerUbigeos,
    0,
    geoMsg.errorCarga,
    [],
  );

  const deptId = useId();
  const provId = useId();
  const distId = useId();
  const helpId = help ? `${deptId}-help` : undefined;

  const departamentos = useMemo(() => {
    const seen = new Set<string>();
    return ubigeos
      .filter((u) => u.departamento && u.departamento.trim() !== "")
      .filter((u) => {
        if (seen.has(u.departamento)) return false;
        seen.add(u.departamento);
        return true;
      })
      .map((u) => ({ value: u.departamento, label: u.departamento }));
  }, [ubigeos]);

  const current = ubigeos.find((u) => u.codigo === value);
  const selectedDepartamento = current?.departamento ?? "";
  const selectedProvincia = current?.provincia ?? "";

  const provincias = useMemo(
    () =>
      ubigeos
        .filter(
          (u) =>
            u.departamento === selectedDepartamento &&
            u.provincia &&
            u.provincia.trim() !== "",
        )
        .filter((u, i, arr) => arr.findIndex((x) => x.provincia === u.provincia) === i)
        .map((u) => ({ value: u.provincia, label: u.provincia })),
    [ubigeos, selectedDepartamento],
  );

  const distritos = useMemo(
    () =>
      ubigeos
        .filter(
          (u) =>
            u.departamento === selectedDepartamento &&
            u.provincia === selectedProvincia &&
            u.distrito &&
            u.distrito.trim() !== "",
        )
        .map((u) => ({ value: u.codigo, label: u.distrito })),
    [ubigeos, selectedDepartamento, selectedProvincia],
  );

  const renderSelect = (
    id: string,
    label: string,
    selValue: string,
    options: Array<{ value: string; label: string }>,
    onSelChange: (v: string) => void,
    emptyPlaceholder: string,
  ) => (
    <div className="form-group">
      <label htmlFor={id} className="form-label-text">
        {label}
      </label>
      <select
        id={id}
        value={selValue}
        onChange={(e) => {
          onSelChange(e.target.value);
        }}
        className={inputClassName}
        disabled={disabled || loading}
      >
        <option value="">{emptyPlaceholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={containerClassName ? `form-group ${containerClassName}` : "form-group"}>
      <div className="form-label-row">
        <label className="form-label-text">
          {geoMsg.selectUbigeo}
          {required && " *"}
        </label>
        {help && <FieldHelpTooltip content={help} label={`Ayuda para ${geoMsg.selectUbigeo}`} />}
      </div>
      <div className="ubigeo-select-grid">
        {renderSelect(
          deptId,
          geoMsg.selectDepartamento,
          selectedDepartamento,
          departamentos,
          () => {
            onChange("");
          },
          loading ? geoMsg.cargandoUbigeos : ui.noDisponible,
        )}
        {renderSelect(
          provId,
          geoMsg.selectProvincia,
          selectedProvincia,
          provincias,
          () => {
            onChange("");
          },
          ui.noDisponible,
        )}
        {renderSelect(
          distId,
          geoMsg.selectDistrito,
          value,
          distritos,
          (codigo) => {
            onChange(codigo);
          },
          ui.noDisponible,
        )}
      </div>
      {help && (
        <span id={helpId} className="sr-only">
          {help}
        </span>
      )}
    </div>
  );
};
