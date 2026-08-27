import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "@/shared/feedback/toast";

export const openExternalUrl = async (url: string, errorMessage: string): Promise<void> => {
  try {
    await openUrl(url);
  } catch {
    toast.error(errorMessage);
  }
};
