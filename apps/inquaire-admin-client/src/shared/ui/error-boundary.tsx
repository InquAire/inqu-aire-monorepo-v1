import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';

import { Button } from './button';
import { Card } from './card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">문제가 발생했습니다</h1>

              <p className="text-slate-600 mb-6">
                죄송합니다. 예기치 않은 오류가 발생했습니다.
                <br />
                페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </p>

              {this.state.error && import.meta.env.DEV && (
                <div className="w-full mb-6 p-4 bg-slate-100 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-600 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium text-slate-700 cursor-pointer">
                        스택 트레이스
                      </summary>
                      <pre className="mt-2 text-xs text-slate-600 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
                <Button onClick={() => (window.location.href = '/dashboard')}>
                  대시보드로 이동
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
