"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export function AppShell({
  role,
  name,
  children,
}: {
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex h-screen">
        <Sidebar role={role} open={menuAberto} onClose={() => setMenuAberto(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={name} role={role} onMenuClick={() => setMenuAberto(true)} />
          <main className="flex-1 overflow-y-auto bg-cda-bg p-4 sm:p-5">
            {/* A animação de entrada mora no template.tsx de cada grupo de rotas, não aqui —
                template.tsx remonta exatamente quando o conteúdo real troca o loading.tsx
                (key={pathname} aqui não pegava essa troca, só a navegação em si). */}
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </main>
          {/* NOVO: rodapé institucional, presente em toda tela */}
          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-cda-border bg-white px-5 py-2.5 text-xs text-cda-text3">
            <span>CDA ERP © {new Date().getFullYear()}. Todos os direitos reservados.</span>
            <span className="flex gap-4">
              <a href="#" className="hover:text-cda-blue">Suporte</a>
              <a href="#" className="hover:text-cda-blue">Termos de uso</a>
            </span>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
