/** Anel de progresso simples (SVG puro, sem biblioteca de gráfico — mesmo
 * padrão já usado em AcompanhamentoCharts) — pedido do dono, redesign da
 * tela inicial da Área Pedagógica: "indicador circular no canto direito"
 * do card da turma, mostrando quantas das 6 entregas do mês já saíram.
 * Ajuste visual (pedido do dono, referência): anel mais grosso, azul só
 * quando já tem progresso (cinza com 0%, pra não parecer "cheio de erro"),
 * percentual escrito centralizado dentro do anel. Cores literais (não os
 * tokens --cda-border/--cda-blue) porque o anel de fundo ficava parecido
 * demais com o de progresso — pedido específico do dono pra distinguir os
 * 2 com mais contraste. */
export function ProgressoCircular({ pct, tamanho = 56 }: { pct: number; tamanho?: number }) {
  const espessura = Math.round(tamanho / 8);
  const raio = tamanho / 2 - espessura / 2 - 1;
  const circunferencia = 2 * Math.PI * raio;
  const pctClamp = Math.min(100, Math.max(0, pct));
  const preenchido = (pctClamp / 100) * circunferencia;
  const centro = tamanho / 2;
  const corFundo = "#e2e8f0";
  const corPreenchido = pctClamp > 0 ? "#2563eb" : corFundo;

  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden>
        <circle cx={centro} cy={centro} r={raio} fill="none" stroke={corFundo} strokeWidth={espessura} />
        {pctClamp > 0 && (
          <circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke={corPreenchido}
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={`${preenchido} ${circunferencia}`}
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-cda-text">{pctClamp}%</span>
    </div>
  );
}
