import { History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatarDataHora } from "@/lib/utils";

type LogItem = { id: string; acao: string; createdAt: string | Date };

export function AtividadeUsuarioSecao({ atividades }: { atividades: LogItem[] }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <History className="h-[15px] w-[15px] text-cda-blue" />
          Atividade recente
        </span>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {atividades.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhuma atividade registrada.</p>
        )}
        {atividades.map((log) => (
          <div key={log.id} className="px-5 py-2.5 text-sm">
            <p className="text-cda-text">{log.acao}</p>
            <p className="text-xs text-cda-text3">{formatarDataHora(log.createdAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
