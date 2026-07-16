import { useCallback } from "react";
import { toast } from "@/shared/feedback/toast";
import { getTauriErrorMessage } from "@/shared/tauri/error";

export function useToastError() {
  return useCallback((error: unknown, prefix = "Error") => {
    toast.error(`${prefix}: ${getTauriErrorMessage(error)}`);
  }, []);
}
