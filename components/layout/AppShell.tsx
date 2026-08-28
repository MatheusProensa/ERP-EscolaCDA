"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NavigationProgress } from "./NavigationProgress";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { PermissoesPorModulo } from "@/lib/permissoes";

export function AppShell({
  meId,
  role,
  permissoes,
  name,
  foto,
  children,
}: {
  meId: string;
  role: string;
  permissoes?: PermissoesPorModulo;
  name: string;
  foto?: string | null;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <div className="flex h-screen">
        <Sidebar meId={meId} role={role} permissoes={permissoes} open={menuAberto} onClose={() => setMenuAberto(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={name} role={role} foto={foto} onMenuClick={() => setMenuAberto(true)} />
          <main className="flex-1 overflow-y-auto bg-cda-bg p-4 sm:p-5">
            {/* Troca de página é corte seco (sem fade) — a barra de progresso acima
                (NavigationProgress) já dá o feedback imediato no clique.
                Largura máxima (handoff de design, etapa 4.8): em monitor grande a
                tabela de alunos esticava além de 1800px sem ganho nenhum de leitura. */}
            <div className="mx-auto max-w-[1360px]">
              <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
            </div>
          </main>
          {/* Rodapé institucional, presente em toda tela — "Suporte"/"Termos de uso" foram
              removidos daqui porque não iam pra lugar nenhum (não existe essa página ainda). */}
          <footer className="flex shrink-0 items-center justify-center border-t border-cda-border bg-white px-5 py-2.5 text-xs text-cda-text3">
            <span>CDA ERP © {new Date().getFullYear()}. Todos os direitos reservados.</span>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
