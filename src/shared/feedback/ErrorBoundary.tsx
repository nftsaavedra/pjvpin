import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <AppIcon icon={AlertTriangle} size={28} className="error-boundary-icon" />
          <h2>{this.props.fallbackTitle ?? "Error inesperado"}</h2>
          <p>{this.state.error?.message ?? "Ocurrio un error al cargar esta seccion."}</p>
          <button type="button" className="btn-secondary" onClick={this.handleRetry}>
            <span className="button-with-icon">
              <AppIcon icon={RotateCcw} size={16} />
              <span>Reintentar</span>
            </span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
