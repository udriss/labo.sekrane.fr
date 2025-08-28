'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  name?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error(`[ErrorBoundary:${this.props.name || 'Boundary'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: 16, color: '#b71c1c', fontFamily: 'monospace' }}>
            <strong>Une erreur est survenue dans {this.props.name || 'le composant'}.</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 12 }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
