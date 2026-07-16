export {
  getAllGrupos,
  getGrupo,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  type CreateGrupoPayload,
  type UpdateGrupoPayload,
} from '@/shared/tauri/grupos';

export { getTauriErrorMessage } from '@/shared/tauri/error';

export type { GrupoInvestigacion } from '@/shared/tauri/types';
