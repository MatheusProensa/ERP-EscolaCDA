import { BarChart3, TrendingUp, Star, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Destaque = { turmaNome: string; regenteNome: string | null; streak: number };
type TurmaPontualidade = { id: string; nome: string; regenteNome: string | null; pontualidadePct: number | null };

/** Faixa de cor por desempenho — mesmos tokens de status do resto do
 * sistema (verde/âmbar/vermelho), nunca uma cor nova só pra esse gráfico. */
function corDaFaixa(pct: number): string {
  if (pct >= 80) return "var(--status-success)";
  if (pct >= 50) return "var(--status-warning)";
  return "var(--status-critical)";
}

function BarraPontualidade({ turmas }: { turmas: TurmaPontualidade[] }) {
  const dados = turmas.filter((t): t is TurmaPontualidade & { pontualidadePct: number } => t.pontualidadePct !== null);
  if (dados.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem dados ainda esse mês"
        subtitle="Aparece assim que a coordenadora definir o prazo e alguma semana for enviada."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-end gap-4 px-1 pb-1 pt-6">
        {dados.map((t) => {
          const altura = Math.max(4, (t.pontualidadePct / 100) * 110);
          return (
            <div
              key={t.id}
              className="flex w-14 flex-col items-center gap-1.5"
              title={`${t.regenteNome ?? t.nome}: ${t.pontualidadePct}% enviado no prazo esse mês`}
            >
              <span className="text-[11px] font-semibold text-cda-text">{t.pontualidadePct}%</span>
              <div className="flex h-[110px] w-6 items-end">
                <div className="w-full rounded-t-[4px]" style={{ height: altura, backgroundColor: corDaFaixa(t.pontualidadePct) }} />
              </div>
              <span className="line-clamp-2 text-center text-[10px] leading-tight text-cda-text3">{t.regenteNome ?? t.nome}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinhaEvolucao({ pontos }: { pontos: { label: string; pct: number }[] }) {
  const w = 280;
  const h = 120;
  const padX = 8;
  const padY = 12;
  const passo = (w - padX * 2) / Math.max(1, pontos.length - 1);
  const y = (pct: number) => padY + (1 - pct / 100) * (h - padY * 2);
  const linhaPath = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${padX + i * passo} ${y(p.pct)}`).join(" ");
  const areaPath = `${linhaPath} L ${padX + (pontos.length - 1) * passo} ${h - padY} L ${padX} ${h - padY} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        {[0, 50, 100].map((linha) => (
          <line key={linha} x1={padX} x2={w - padX} y1={y(linha)} y2={y(linha)} stroke="var(--cda-border)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="var(--status-info)" opacity="0.08" stroke="none" />
        <path d={linhaPath} fill="none" stroke="var(--status-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pontos.map((p, i) => (
          <circle key={p.label} cx={padX + i * passo} cy={y(p.pct)} r="3" fill="var(--status-info)">
            <title>{`${p.label}: ${p.pct}% das turmas em dia`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-cda-text3">
        {pontos.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function CardDestaques({ destaquePontual, destaqueAtencao }: { destaquePontual: Destaque | null; destaqueAtencao: Destaque | null }) {
  if (!destaquePontual && !destaqueAtencao) {
    return <p className="px-1 py-6 text-center text-xs text-cda-text3">Sem destaques ainda — aparece depois de alguns meses de histórico.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {destaquePontual && (
        <div className="flex items-start gap-2.5 rounded-lg border border-cda-border bg-cda-bg p-3">
          <Star className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--status-success)" }} />
          <div>
            <p className="text-xs font-semibold text-cda-text">Mais pontual</p>
            <p className="text-xs text-cda-text2">
              {destaquePontual.regenteNome ?? destaquePontual.turmaNome} · {destaquePontual.turmaNome}
            </p>
            <p className="text-xs text-cda-text3">{destaquePontual.streak} meses em dia</p>
          </div>
        </div>
      )}
      {destaqueAtencao && (
        <div className="flex items-start gap-2.5 rounded-lg border border-cda-border bg-cda-bg p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--status-critical)" }} />
          <div>
            <p className="text-xs font-semibold text-cda-text">Atenção</p>
            <p className="text-xs text-cda-text2">
              {destaqueAtencao.regenteNome ?? destaqueAtencao.turmaNome} · {destaqueAtencao.turmaNome}
            </p>
            <p className="text-xs text-cda-text3">{destaqueAtencao.streak} meses seguidos atrasado</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Linha de 3 cards abaixo do painel mestre-detalhe — Pontualidade do mês
 * (por turma, contra o prazo), Evolução mensal (últimos 6 meses, % de
 * turmas em dia) e Destaques (streaks). Mesmo mockup do dono (Gemini):
 * "quero todas aquelas funções". Servidor já manda tudo calculado — sem
 * interatividade real aqui além do title/tooltip nativo do SVG, por isso é
 * componente de servidor (sem "use client"), não pesa no bundle do cliente. */
export function AcompanhamentoCharts({
  turmas,
  evolucaoMensal,
  destaquePontual,
  destaqueAtencao,
}: {
  turmas: TurmaPontualidade[];
  evolucaoMensal: { label: string; pct: number }[];
  destaquePontual: Destaque | null;
  destaqueAtencao: Destaque | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card
        title={
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cda-blue" />
            Pontualidade do mês
          </div>
        }
      >
        <div className="p-4">
          <BarraPontualidade turmas={turmas} />
        </div>
      </Card>
      <Card
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cda-blue" />
            Evolução mensal
          </div>
        }
      >
        <div className="p-4">
          <LinhaEvolucao pontos={evolucaoMensal} />
        </div>
      </Card>
      <Card
        title={
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-cda-blue" />
            Destaques
          </div>
        }
      >
        <div className="p-4">
          <CardDestaques destaquePontual={destaquePontual} destaqueAtencao={destaqueAtencao} />
        </div>
      </Card>
    </div>
  );
}
