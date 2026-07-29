import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Redesenhado: era um card compacto com badge inline; agora é o mesmo padrão
 * de "banner de atenção" usado no resto do sistema (título em negrito + texto
 * + botão de ação à direita), pra não competir visualmente com os MetricCards
 * acima nem parecer um elemento solto.
 */
export function CensoAlerta({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;
  return (
    <Card className="flex items-center gap-3.5 border-cda-amber/30 bg-cda-amber/[0.06] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cda-amber/[0.18]">
        <ClipboardList className="h-4 w-4 text-cda-amber" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-cda-text">Alerta importante</p>
        <p className="text-sm text-cda-text2">
          {quantidade} aluno(s) com dados incompletos para o censo escolar (sexo, raça/cor ou nome da mãe).
        </p>
      </div>
      <Button href="/alunos?censo=incompleto" className="shrink-0 bg-cda-navy hover:bg-cda-navy/90">
        Resolver pendências
      </Button>
    </Card>
  );
}
