import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface TurmaCardProps {
  id: string;
  nome: string;
  turno: "MANHA" | "TARDE";
  capacidade: number;
  matriculados: number;
}

const TURNO_STYLE = {
  TARDE: { label: "Tarde", bg: "#EBF4FF", text: "#1A6FD8" },
  MANHA: { label: "Manhã", bg: "#EEEDFE", text: "#3C3489" },
};

export function TurmaCard({ id, nome, turno, capacidade, matriculados }: TurmaCardProps) {
  const ocupacao = capacidade > 0 ? matriculados / capacidade : 0;
  const lotada = matriculados >= capacidade;
  const corBarra = lotada ? "#DC2626" : ocupacao >= 0.8 ? "#D97706" : "#16A34A";
  const turnoStyle = TURNO_STYLE[turno];

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-cda-text">{nome}</p>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: turnoStyle.bg, color: turnoStyle.text }}
        >
          {turnoStyle.label}
        </span>
      </div>

      <p className="text-sm text-cda-text2">
        {matriculados} / {capacidade} alunos
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cda-bg">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, ocupacao * 100)}%`, backgroundColor: corBarra }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={lotada ? "red" : "green"}>{lotada ? "Lotada" : "Com vaga"}</Badge>
        <Link
          href={`/academico/turmas/${id}`}
          className={cn("text-sm font-medium text-cda-blue hover:underline")}
        >
          Ver alunos
        </Link>
      </div>
    </Card>
  );
}
