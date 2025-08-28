'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Typography, Button, Box } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryKey: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryKey: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryKey: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);

    // Appeler le callback onError si fourni
    this.props.onError?.(error, errorInfo);

    // Si c'est une erreur webpack HMR, ne pas l'afficher en production
    if (
      process.env.NODE_ENV === 'development' &&
      (error.message?.includes('originalFactory.call') || error.message?.includes('webpack'))
    ) {
      console.warn('HMR error detected, attempting to recover...');
      // Tentative de récupération automatique
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
    }
  }

  private handleRetry = () => {
    try {
      // Inform the app a retry is occurring (guards can apply grace period)
      window.dispatchEvent(new CustomEvent('app:retry'));
    } catch {}
    // Clear error and force a remount of the subtree via changing a key
    this.setState((prev) => ({ hasError: false, error: undefined, retryKey: prev.retryKey + 1 }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isHMRError =
        this.state.error?.message?.includes('originalFactory.call') ||
        this.state.error?.message?.includes('webpack');

      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Alert
            severity={isHMRError ? 'warning' : 'error'}
            sx={{ maxWidth: 680, borderRadius: 2, p: 3, width: '100%' }}
          >
            <Typography variant="h6" gutterBottom>
              {isHMRError ? 'Erreur de développement détectée' : "Une erreur s'est produite"}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {isHMRError
                ? 'Cette erreur est liée au rechargement à chaud (HMR). Elle devrait se résoudre automatiquement.'
                : "Une erreur inattendue s'est produite lors du chargement de cette page."}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 200,
                  bgcolor: 'rgba(0,0,0,0.06)',
                  p: 1,
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                {this.state.error.message}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 1 }}>
              <Button variant="outlined" size="small" onClick={this.handleRetry}>
                Réessayer
              </Button>
              <Button variant="contained" size="small" onClick={this.handleReload}>
                Recharger la page
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    // Force remount on each retry to reset client state safely
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

export default GlobalErrorBoundary;
