import { useState, useCallback } from "react";

export interface PendingChange {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

export function usePendingChange() {
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const requestChange = useCallback((change: PendingChange) => {
    setPendingChange(change);
  }, []);

  const confirmChange = useCallback(() => {
    pendingChange?.onConfirm();
    setPendingChange(null);
  }, [pendingChange]);

  const cancelChange = useCallback(() => {
    setPendingChange(null);
  }, []);

  return { pendingChange, requestChange, confirmChange, cancelChange };
}
