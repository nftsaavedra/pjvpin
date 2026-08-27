import React, { useMemo, useState } from "react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { FormSelect } from "@/shared/forms/FormSelect";
import { UbigeoSelect } from "@/shared/forms/UbigeoSelect";
import { inputClassName } from "@/shared/forms/inputClassName";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { useStableFetch } from "@/shared/hooks/useStableFetch";
import { getTauriErrorMessage } from "@/shared/tauri/error";
import { actualizarOrgUnit, crearOrgUnit } from "@/shared/tauri/orgUnits";
import { listarVocabItems } from "@/shared/tauri/vocabularios";
import type { CatalogoItem, OrgUnit } from "@/shared/tauri/types";

interface OrgUnitFormModalProps {
  mode: "create" | "edit";
  initial: OrgUnit | null;
  allUnits: OrgUnit[];
  onClose: () => void;
  onSaved: () => void;
}

const TIPO_ORG_OPTIONS = [
  { value: "tipo_org_universidad", label: messages.orgUnits.fields.tipoOrgUniversidad },
  { value: "tipo_org_instituto", label: messages.orgUnits.fields.tipoOrgInstituto },
];

const RUC_REGEX = /^\d{11}$/;

export const OrgUnitFormModal: React.FC<OrgUnitFormModalProps> = ({
  mode,
  initial,
  allUnits,
  onClose,
  onSaved,
}) => {
  const isEdit = mode === "edit";

  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [tipoOrganizacion, setTipoOrganizacion] = useState(initial?.tipo_organizacion ?? "");
  const [esPublica, setEsPublica] = useState(initial?.es_publica ?? true);
  const [parentId, setParentId] = useState(initial?.parent_id ?? "");
  const [ubigeoCodigo, setUbigeoCodigo] = useState(initial?.ubigeo_codigo ?? "");
  const [ruc, setRuc] = useState(initial?.ruc ?? "");
  const [rorId, setRorId] = useState(initial?.ror_id ?? "");
  const [isniId, setIsniId] = useState(initial?.isni_id ?? "");
  const [scopusId, setScopusId] = useState(initial?.scopus_id ?? "");
  const [ciiuCodigo, setCiiuCodigo] = useState(initial?.ciiu_codigo ?? "");
  const [sectorInstitucional, setSectorInstitucional] = useState(
    initial?.sector_institucional ?? "",
  );
  const [tipoDependencia, setTipoDependencia] = useState(initial?.tipo_dependencia ?? "");
  const [tipoEducacionSuperior, setTipoEducacionSuperior] = useState(
    initial?.tipo_educacion_superior ?? "",
  );
  // ---- N2-G: alineamiento PeruCRIS ----
  const [legalName, setLegalName] = useState(initial?.legal_name ?? "");
  const [acronimo, setAcronimo] = useState(initial?.acronimo ?? "");
  const [webSite, setWebSite] = useState(initial?.web_site ?? "");
  const [direccion, setDireccion] = useState(initial?.direccion ?? "");
  const [pais, setPais] = useState(initial?.pais ?? "PE");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [rinId, setRinId] = useState(initial?.rin_id ?? "");
  const [suneduClasificacion, setSuneduClasificacion] = useState(
    initial?.sunedu_clasificacion ?? "",
  );
  const [suneduEstado, setSuneduEstado] = useState(initial?.sunedu_estado ?? "");
  const [suneduResolucion, setSuneduResolucion] = useState(initial?.sunedu_resolucion ?? "");
  const [perucrisUuid, setPerucrisUuid] = useState(initial?.perucris_uuid ?? "");
  const [perucrisHandle, setPerucrisHandle] = useState(initial?.perucris_handle ?? "");
  const [showPerucrisSection, setShowPerucrisSection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: sectores } = useStableFetch<CatalogoItem[]>(
    () => listarVocabItems("ocde_sector_institucional"),
    0,
    messages.orgUnits.errorCarga,
    [],
  );
  const { data: tiposDependencia } = useStableFetch<CatalogoItem[]>(
    () => listarVocabItems("concytec_tipo_subunidad"),
    0,
    messages.orgUnits.errorCarga,
    [],
  );
  const { data: tiposEducacionSuperior } = useStableFetch<CatalogoItem[]>(
    () => listarVocabItems("sunedu_tipo_institucion"),
    0,
    messages.orgUnits.errorCarga,
    [],
  );

  const vocabOptions = (items: CatalogoItem[]) =>
    items.map((item) => ({ value: item.codigo_skos ?? item.codigo, label: item.nombre }));

  const parentOptions = useMemo(
    () =>
      allUnits
        .filter((u) => u.id_org_unit !== initial?.id_org_unit)
        .map((u) => ({ value: u.id_org_unit, label: u.nombre })),
    [allUnits, initial],
  );

  const isSubunidad = parentId.trim() !== "";

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !tipoOrganizacion) {
      toast.warning(messages.orgUnits.validations.completeCampos);
      return;
    }
    const rucTrim = ruc.trim();
    if (rucTrim && !RUC_REGEX.test(rucTrim)) {
      toast.warning(messages.orgUnits.validations.rucInvalido);
      return;
    }
    if (isSubunidad) {
      if (!tipoDependencia) {
        toast.warning(messages.orgUnits.validations.subunidadRequiereDependencia);
        return;
      }
    } else if (!rucTrim && !rorId.trim() && !isniId.trim()) {
      toast.warning(messages.orgUnits.validations.matrizRequiereId);
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && initial) {
        await actualizarOrgUnit(initial.id_org_unit, {
          nombre: nombre.trim(),
          ubigeoCodigo: ubigeoCodigo || null,
          rorId: rorId.trim() || null,
          isniId: isniId.trim() || null,
          scopusId: scopusId.trim() || null,
          sectorInstitucional: sectorInstitucional || null,
          tipoDependencia: isSubunidad ? tipoDependencia || null : null,
          tipoEducacionSuperior: tipoEducacionSuperior || null,
          ciiuCodigo: ciiuCodigo.trim() || null,
          esPublica,
          parentId: parentId || null,
          legalName: legalName.trim() || null,
          acronimo: acronimo.trim() || null,
          webSite: webSite.trim() || null,
          direccion: direccion.trim() || null,
          pais: pais.trim().toUpperCase() || null,
          descripcion: descripcion.trim() || null,
          rinId: rinId.trim() || null,
          suneduClasificacion: suneduClasificacion.trim() || null,
          suneduEstado: suneduEstado.trim() || null,
          suneduResolucion: suneduResolucion.trim() || null,
          perucrisUuid: perucrisUuid.trim() || null,
          perucrisHandle: perucrisHandle.trim() || null,
        });
        toast.success(messages.orgUnits.success.actualizado);
      } else {
        await crearOrgUnit({
          nombre: nombre.trim(),
          ubigeoCodigo: ubigeoCodigo || null,
          ruc: rucTrim || null,
          rorId: rorId.trim() || null,
          isniId: isniId.trim() || null,
          scopusId: scopusId.trim() || null,
          sectorInstitucional: sectorInstitucional || null,
          tipoOrganizacion,
          tipoDependencia: isSubunidad ? tipoDependencia || null : null,
          tipoEducacionSuperior: tipoEducacionSuperior || null,
          ciiuCodigo: ciiuCodigo.trim() || null,
          esPublica,
          parentId: parentId || null,
          legalName: legalName.trim() || null,
          acronimo: acronimo.trim() || null,
          webSite: webSite.trim() || null,
          direccion: direccion.trim() || null,
          pais: pais.trim().toUpperCase() || null,
          descripcion: descripcion.trim() || null,
          rinId: rinId.trim() || null,
          suneduClasificacion: suneduClasificacion.trim() || null,
          suneduEstado: suneduEstado.trim() || null,
          suneduResolucion: suneduResolucion.trim() || null,
          perucrisUuid: perucrisUuid.trim() || null,
          perucrisHandle: perucrisHandle.trim() || null,
        });
        toast.success(messages.orgUnits.success.creado);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(messages.ui.errorConDetalle(getTauriErrorMessage(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormModal
      open
      title={
        <span className="title-with-icon form-card-title">
          <AppIcon icon={Save} size={20} />
          <span>{isEdit ? messages.orgUnits.modal.editar : messages.orgUnits.modal.crear}</span>
        </span>
      }
      onClose={onClose}
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      submitText={
        <span className="button-with-icon">
          <AppIcon icon={Save} size={18} />
          <span>{isEdit ? messages.orgUnits.actualizar : messages.orgUnits.crear}</span>
        </span>
      }
      isLoading={isLoading}
      size="lg"
    >
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormInput
          label={messages.orgUnits.fields.nombre}
          value={nombre}
          onChange={setNombre}
          required
        />

        <FormSelect
          label={messages.orgUnits.fields.tipoOrganizacion}
          value={tipoOrganizacion}
          onChange={setTipoOrganizacion}
          options={TIPO_ORG_OPTIONS}
          required
          disabled={isEdit}
        />

        <FormSelect
          label={messages.orgUnits.fields.parent}
          value={parentId}
          onChange={setParentId}
          options={parentOptions}
          help={messages.orgUnits.fields.parentHelp}
        />

        <FormSelect
          label={messages.orgUnits.fields.sectorInstitucional}
          value={sectorInstitucional}
          onChange={setSectorInstitucional}
          options={vocabOptions(sectores)}
        />

        <FormSelect
          label={messages.orgUnits.fields.tipoEducacionSuperior}
          value={tipoEducacionSuperior}
          onChange={setTipoEducacionSuperior}
          options={vocabOptions(tiposEducacionSuperior)}
        />

        {isSubunidad && (
          <FormSelect
            label={messages.orgUnits.fields.tipoDependencia}
            value={tipoDependencia}
            onChange={setTipoDependencia}
            options={vocabOptions(tiposDependencia)}
            required
            help={messages.orgUnits.fields.tipoDependenciaHelp}
          />
        )}

        <FormInput
          label={messages.orgUnits.fields.ruc}
          value={ruc}
          onChange={setRuc}
          maxLength={11}
          help={messages.orgUnits.fields.rucHelp}
          disabled={isEdit}
        />

        <FormInput label={messages.orgUnits.fields.rorId} value={rorId} onChange={setRorId} />

        <FormInput label={messages.orgUnits.fields.isniId} value={isniId} onChange={setIsniId} />

        <FormInput
          label={messages.orgUnits.fields.scopusId}
          value={scopusId}
          onChange={setScopusId}
        />

        <FormInput
          label={messages.orgUnits.fields.ciiuCodigo}
          value={ciiuCodigo}
          onChange={setCiiuCodigo}
        />

        <div className="md:col-span-2">
          <UbigeoSelect
            value={ubigeoCodigo}
            onChange={setUbigeoCodigo}
            help={messages.orgUnits.fields.ubigeoHelp}
          />
        </div>

        <div className="form-group md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={esPublica}
              onChange={(e) => {
                setEsPublica(e.target.checked);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="form-label-text">{messages.orgUnits.fields.esPublica}</span>
          </label>
        </div>

        <div className="md:col-span-2 mt-2 border-t border-gray-200 pt-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            onClick={() => {
              setShowPerucrisSection((v) => !v);
            }}
            aria-expanded={showPerucrisSection}
          >
            <AppIcon icon={showPerucrisSection ? ChevronUp : ChevronDown} size={16} />
            <span>{messages.orgUnits.fields.perucrisSectionToggle}</span>
          </button>
          {showPerucrisSection && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label={messages.orgUnits.fields.legalName}
                value={legalName}
                onChange={setLegalName}
                help={messages.orgUnits.fields.legalNameHelp}
              />
              <FormInput
                label={messages.orgUnits.fields.acronimo}
                value={acronimo}
                onChange={setAcronimo}
              />
              <FormInput
                label={messages.orgUnits.fields.webSite}
                value={webSite}
                onChange={setWebSite}
                placeholder="https://"
                containerClassName="md:col-span-2"
              />
              <FormInput
                label={messages.orgUnits.fields.direccion}
                value={direccion}
                onChange={setDireccion}
                containerClassName="md:col-span-2"
              />
              <FormInput
                label={messages.orgUnits.fields.pais}
                value={pais}
                onChange={(v) => {
                  setPais(v.toUpperCase());
                }}
                maxLength={2}
                placeholder="PE"
              />
              <FormInput
                label={messages.orgUnits.fields.rinId}
                value={rinId}
                onChange={setRinId}
                help={messages.orgUnits.fields.rinIdHelp}
              />
              <FormInput
                label={messages.orgUnits.fields.suneduClasificacion}
                value={suneduClasificacion}
                onChange={setSuneduClasificacion}
                containerClassName="md:col-span-2"
              />
              <FormInput
                label={messages.orgUnits.fields.suneduEstado}
                value={suneduEstado}
                onChange={setSuneduEstado}
              />
              <FormInput
                label={messages.orgUnits.fields.suneduResolucion}
                value={suneduResolucion}
                onChange={setSuneduResolucion}
                containerClassName="md:col-span-2"
              />
              <FormInput
                label={messages.orgUnits.fields.perucrisUuid}
                value={perucrisUuid}
                onChange={setPerucrisUuid}
                help={messages.orgUnits.fields.perucrisUuidHelp}
              />
              <FormInput
                label={messages.orgUnits.fields.perucrisHandle}
                value={perucrisHandle}
                onChange={setPerucrisHandle}
                placeholder="123456789/12345"
              />
              <div className="form-group md:col-span-2">
                <label htmlFor="org-descripcion" className="form-label-text">
                  {messages.orgUnits.fields.descripcion}
                </label>
                <textarea
                  id="org-descripcion"
                  className={inputClassName}
                  rows={3}
                  maxLength={4000}
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
};
