import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/shared/feedback/ErrorBoundary";
import { AppFatalFallback } from "./app/components/AppFatalFallback";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Error critico de aplicacion" fallback={<AppFatalFallback />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
