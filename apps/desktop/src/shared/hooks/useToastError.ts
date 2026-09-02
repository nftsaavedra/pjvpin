import { useCallback } from "react";
import { toast } from "@/shared/feedback/toast";
import { getErrorMessage } from "@/shared/http/error";

export function useToastError() {
  return useCallback((error: unknown, prefix = "Error") => {
    toast.error(`${prefix}: ${getErrorMessage(error)}`);
  }, []);
}
