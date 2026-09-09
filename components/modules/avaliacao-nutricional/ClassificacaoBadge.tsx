import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { CLASSIFICACAO_LABEL, type ClassificacaoImc } from "@/lib/avaliacaoNutricional";

// Aqui SIM é estado de verdade (diferente do saldo de banco de horas — ver
// achado da auditoria de UX em PontoMesForm.tsx): a classificação de IMC é
// literalmente um diagnóstico, cor semântica é a leitura correta.
// Exportado: MetricCard usa o mesmo tom pro card de "IMC atual" na ficha do
// aluno, pra classificação ler igual em badge e card.
export const CLASSIFICACAO_VARIANTE: Record<ClassificacaoImc, BadgeVariant> = {
  BAIXO: "warning",
  EUTROFICO: "success",
  SOBREPESO: "warning",
  OBESIDADE: "critical",
};

export function ClassificacaoBadge({ classificacao }: { classificacao: ClassificacaoImc }) {
  return <Badge variant={CLASSIFICACAO_VARIANTE[classificacao]}>{CLASSIFICACAO_LABEL[classificacao]}</Badge>;
}
