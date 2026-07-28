import type { Mensalidade, Pagamento, SituacaoMensalidade } from "@prisma/client";
import { diasEmAtraso } from "@/lib/utils";

export type MensalidadeComPagamentos = Mensalidade & { pagamentos: Pagamento[] };

/**
 * Filtro Prisma pra mensalidades em aberto e já vencidas — "atrasada" é calculado
 * a partir do vencimento, não de um campo `situacao` que precisaria de um job externo
 * pra ser atualizado (o campo ATRASADA nunca era escrito em lugar nenhum do sistema).
 */
export function whereAtrasadas(hoje: Date = new Date()) {
  return {
    situacao: { in: ["PENDENTE", "ATRASADA"] as SituacaoMensalidade[] },
    vencimento: { lt: hoje },
  };
}

/** Quanto ainda falta pagar dessa mensalidade, descontando pagamentos já registrados (parciais inclusive). */
export function saldoDevedor(m: MensalidadeComPagamentos): number {
  if (m.situacao === "CANCELADA" || m.situacao === "PAGA") return 0;
  const pago = m.pagamentos.reduce((acc, p) => acc + p.valor, 0);
  return Math.max(0, m.valor - pago);
}

export type Inadimplente = { alunoId: string; nome: string; turma: string; valor: number; diasAtraso: number };

type MensalidadeComMatricula = MensalidadeComPagamentos & {
  matricula: { alunoId: string; aluno: { nome: string }; turma: { nome: string } };
};

/** Agrupa mensalidades atrasadas por aluno, somando o saldo devedor real (não o valor cheio quando há pagamento parcial). */
export function agruparInadimplentes(mensalidades: MensalidadeComMatricula[]): Inadimplente[] {
  const porAluno = new Map<string, Inadimplente>();
  for (const m of mensalidades) {
    const valor = saldoDevedor(m);
    if (valor <= 0) continue;
    const atraso = diasEmAtraso(m.vencimento);
    const existente = porAluno.get(m.matricula.alunoId);
    if (existente) {
      existente.valor += valor;
      existente.diasAtraso = Math.max(existente.diasAtraso, atraso);
    } else {
      porAluno.set(m.matricula.alunoId, {
        alunoId: m.matricula.alunoId,
        nome: m.matricula.aluno.nome,
        turma: m.matricula.turma.nome,
        valor,
        diasAtraso: atraso,
      });
    }
  }
  return Array.from(porAluno.values()).sort((a, b) => b.diasAtraso - a.diasAtraso);
}
