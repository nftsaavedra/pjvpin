import React from "react";
import { CheckCircle, Loader2, Minus, XCircle } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";

export type ConnectivityStatus = "running" | "ok" | "fail" | "skipped" | "idle";

interface ConnectivityRowProps {
  label: string;
  status: ConnectivityStatus;
  message: string;
  optional?: boolean;
}

const STATUS_LABEL: Record<ConnectivityStatus, string> = {
  running: "Probando",
  ok: "Conectado",
  fail: "Falló",
  skipped: "Omitido",
  idle: "En espera",
};

const STRIP_CLASSES: Record<ConnectivityStatus, string> = {
  running: "bg-primary",
  ok: "bg-emerald-500",
  fail: "bg-red-500",
  skipped: "bg-slate-300",
  idle: "bg-border",
};

const CARD_CLASSES: Record<ConnectivityStatus, string> = {
  running: "bg-blue-50/50 border-blue-200",
  ok: "bg-emerald-50/50 border-emerald-200",
  fail: "bg-red-50/50 border-red-200",
  skipped: "bg-bg border-border opacity-80",
  idle: "bg-card border-border",
};

export const ConnectivityRow: React.FC<ConnectivityRowProps> = ({
  label,
  status,
  message,
  optional = false,
}) => {
  const icon = (() => {
    switch (status) {
      case "running":
        return <AppIcon icon={Loader2} size={18} className="animate-spin text-primary" />;
      case "ok":
        return <AppIcon icon={CheckCircle} size={18} className="text-emerald-600" />;
      case "fail":
        return <AppIcon icon={XCircle} size={18} className="text-red-600" />;
      case "skipped":
        return <AppIcon icon={Minus} size={18} className="text-slate-400" />;
      default:
        return null;
    }
  })();

  return (
    <div
      className={`relative flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl border ${CARD_CLASSES[status]}`}
      role="status"
      aria-live={status === "running" ? "polite" : undefined}
    >
      <div
        className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${STRIP_CLASSES[status]}`}
        aria-hidden="true"
      />
      <span className="shrink-0 flex items-center justify-center w-7">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="text-sm font-bold text-text-primary">{label}</strong>
          {optional && (
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-text-secondary">
              Opcional
            </span>
          )}
        </div>
        <span
          className={`text-xs break-words ${
            status === "fail" ? "text-red-700" : "text-text-secondary"
          }`}
        >
          {message || STATUS_LABEL[status]}
        </span>
      </div>
      <span
        className={`shrink-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full ${
          status === "ok"
            ? "bg-emerald-100 text-emerald-700"
            : status === "fail"
              ? "bg-red-100 text-red-700"
              : status === "skipped"
                ? "bg-slate-100 text-slate-500"
                : status === "running"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-bg text-text-secondary"
        }`}
      >
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
};
