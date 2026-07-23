import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function CensoAlerta({ quantidade }: { quantidade: number }) {
  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cda-amber/10">
          <ClipboardList className="h-5 w-5 text-cda-amber" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cda-text">{quantidade}</span>
            <span className="text-sm text-cda-text2">aluno(s) com dados incompletos para o censo</span>
            {quantidade > 0 && <Badge variant="amber">Atenção</Badge>}
          </div>
          <p className="text-xs text-cda-text3">Faltando sexo, raça/cor ou nome da mãe (Educacenso)</p>
        </div>
      </div>
      <Link href="/alunos?censo=incompleto" className="shrink-0 text-sm font-medium text-cda-blue hover:underline">
        Ver lista →
      </Link>
    </Card>
  );
}
