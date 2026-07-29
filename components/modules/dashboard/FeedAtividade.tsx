import { Card } from "@/components/ui/Card";
import { formatarDataHora } from "@/lib/utils";
import type { LogAtividade } from "@prisma/client";
import { Activity, Wallet, UserPlus, Megaphone } from "lucide-react";

/**
 * NOVO: ícone por tipo de atividade (antes todo item usava o mesmo ícone
 * genérico "Activity") — melhora a hierarquia visual do feed. Ajuste as
 * palavras-chave conforme o texto real gerado em cada `logAtividade.create()`.
 */
function iconePorAcao(acao: string) {
  const texto = acao.toLowerCase();
  if (texto.includes("pagamento")) return Wallet;
  if (texto.includes("matricul")) return UserPlus;
  if (texto.includes("mural") || texto.includes("aviso")) return Megaphone;
  return Activity;
}

export function FeedAtividade({ logs }: { logs: LogAtividade[] }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Activity className="h-[15px] w-[15px] text-cda-blue" />
          Atividade recente
        </span>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {logs.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-cda-text3">Nenhuma atividade ainda.</p>
        )}
        {logs.map((log) => {
          const Icon = iconePorAcao(log.acao);
          return (
            <div key={log.id} className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cda-blue/10">
                <Icon className="h-3.5 w-3.5 text-cda-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-cda-text">{log.acao}</p>
                <p className="text-xs text-cda-text3">
                  {log.usuario} · {formatarDataHora(log.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
