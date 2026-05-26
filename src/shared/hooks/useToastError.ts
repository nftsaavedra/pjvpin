import { useCallback } from "react";
import { toast } from "@/services/toast";
import { getTauriErrorMessage } from "@/services/tauri/error";

export function useToastError() {
  return useCallback((error: unknown, prefix = "Error") => {
    toast.error(`${prefix}: ${getTauriErrorMessage(error)}`);
  }, []);
}
