"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC]">
          <div className="text-center max-w-md">
            <p className="text-sm font-semibold text-[#E67E22] mb-2">页面出现错误</p>
            <p className="text-xs text-[#7F8A93] mb-4">
              {this.state.error?.message ?? "未知错误"}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              variant="outline"
              className="h-8 text-xs"
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
