/** Anel de progresso simples (SVG puro, sem biblioteca de gráfico — mesmo
 * padrão já usado em AcompanhamentoCharts) — pedido do dono, redesign da
 * tela inicial da Área Pedagógica: "indicador circular no canto direito"
 * do card da turma, mostrando quantas das 6 entregas do mês já saíram. */
export function ProgressoCircular({ pct, tamanho = 44 }: { pct: number; tamanho?: number }) {
  const raio = tamanho / 2 - 4;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (Math.min(100, Math.max(0, pct)) / 100) * circunferencia;
  const centro = tamanho / 2;

  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="shrink-0" aria-hidden>
      <circle cx={centro} cy={centro} r={raio} fill="none" stroke="var(--cda-border)" strokeWidth={4} />
      <circle
        cx={centro}
        cy={centro}
        r={raio}
        fill="none"
        stroke="var(--cda-blue)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${preenchido} ${circunferencia}`}
        transform={`rotate(-90 ${centro} ${centro})`}
      />
    </svg>
  );
}
