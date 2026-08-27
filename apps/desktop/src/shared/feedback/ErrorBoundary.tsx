import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { messages } from "@/shared/feedback/messages";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallback?: React.ReactNode;
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
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center gap-2.5 px-8 py-12 text-center">
          <AppIcon icon={AlertTriangle} size={28} className="text-amber-500" />
          <h2 className="text-lg text-gray-800 m-0">
            {this.props.fallbackTitle ?? messages.shared.errorBoundaryTitleDefault}
          </h2>
          <p className="text-sm text-gray-500 max-w-[36ch] m-0 leading-6">
            {this.state.error?.message ?? messages.shared.errorBoundaryMessageDefault}
          </p>
          <button type="button" className="btn-secondary" onClick={this.handleRetry}>
            <span className="button-with-icon">
              <AppIcon icon={RotateCcw} size={16} />
              <span>{messages.ui.reintentar}</span>
            </span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
