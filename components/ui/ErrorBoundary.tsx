"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

/**
 * Evita que um erro de render numa tela derrube o app inteiro (tela branca).
 * Envolva cada rota de nível superior — ex. em AppShell:
 *   <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturou:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cda-red/10">
              <AlertTriangle className="h-6 w-6 text-cda-red" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-cda-text">Algo deu errado nesta tela</h2>
            <p className="mb-5 text-sm text-cda-text2">
              O restante do sistema continua funcionando. Tente recarregar esta tela.
            </p>
            <Button onClick={() => this.setState({ error: null })}>Recarregar</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
