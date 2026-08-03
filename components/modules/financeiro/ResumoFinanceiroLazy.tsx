"use client";

import dynamic from "next/dynamic";
import type { ResumoMensal } from "@/components/modules/financeiro/ResumoFinanceiro";

/** recharts só entra no bundle do cliente quando essa aba realmente abre —
 * evita gastar JS/hidratação com a biblioteca do gráfico numa página que só
 * mostra um "carregando" enquanto isso (o gráfico não ganha nada rodando no
 * servidor: ResponsiveContainer depende do tamanho real do elemento no
 * navegador, então SSR dele sempre re-renderiza do zero no client mesmo). */
const ResumoFinanceiro = dynamic(
  () => import("@/components/modules/financeiro/ResumoFinanceiro").then((m) => m.ResumoFinanceiro),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded-[10px] border border-cda-border bg-cda-surface" />,
  }
);

export function ResumoFinanceiroLazy(props: { dados: ResumoMensal[] }) {
  return <ResumoFinanceiro {...props} />;
}
