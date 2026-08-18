import React, { useMemo, useState } from "react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Save } from "lucide-react";
import { FormInput } from "@/shared/forms/FormInput";
import { FormModal } from "@/shared/forms/FormModal";
import { FormSelect } from "@/shared/forms/FormSelect";
import { UbigeoSelect } from "@/shared/forms/UbigeoSelect";
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

        <FormInput label={messages.orgUnits.fields.scopusId} value={scopusId} onChange={setScopusId} />

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
      </div>
    </FormModal>
  );
};
