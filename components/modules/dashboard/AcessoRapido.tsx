import Link from "next/link";
import { UserPlus, FileSignature, UserCog, Printer, CalendarDays, History, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

const ATALHOS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Novo aluno", href: "/alunos", icon: UserPlus },
  { label: "Novo contrato", href: "/alunos?contrato=pendente", icon: FileSignature },
  { label: "Funcionários", href: "/funcionarios", icon: UserCog },
  { label: "Fila de impressão", href: "/impressao", icon: Printer },
  { label: "Calendário", href: "/calendario", icon: CalendarDays },
  { label: "Relatórios", href: "/log-atividades", icon: History },
];

/** Grid de atalhos do Dashboard (pedido do dono, mockup de referência) —
 * "Novo aluno"/"Novo contrato" levam pra /alunos (é lá que o botão "Novo
 * aluno" e a ficha com o contrato vivem hoje — não existe rota que abra o
 * modal direto, então o atalho leva pra tela certa, não fura navegação
 * nova). "Relatórios" não tem tela própria no sistema hoje — vai pra Log de
 * Atividades, confirmado com o dono. */
export function AcessoRapido() {
  return (
    <Card title="Acesso rápido">
      <div className="grid grid-cols-3 gap-3 p-4">
        {ATALHOS.map((atalho) => (
          <Link
            key={atalho.label}
            href={atalho.href}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-cda-border px-2 py-3 text-center transition-colors hover:bg-cda-bg"
          >
            <atalho.icon className="h-4 w-4 text-cda-blue" />
            <span className="text-[11px] font-medium leading-tight text-cda-text2">{atalho.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
