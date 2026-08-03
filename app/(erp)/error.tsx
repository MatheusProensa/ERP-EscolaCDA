"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Boundary de erro pra todo o grupo (erp) — sem isso, um erro de render (ex.:
 * falha de conexão com o banco num Server Component) derrubava a tela inteira
 * em branco, sem explicação nem forma de tentar de novo sem recarregar a página. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cda-red/10">
        <AlertTriangle className="h-6 w-6 text-cda-red" />
      </div>
      <div>
        <p className="text-sm font-semibold text-cda-text">Não foi possível carregar esta página.</p>
        <p className="mt-1 text-sm text-cda-text3">Pode ter sido uma falha de conexão passageira.</p>
      </div>
      <Button onClick={reset}>Tentar de novo</Button>
    </div>
  );
}
