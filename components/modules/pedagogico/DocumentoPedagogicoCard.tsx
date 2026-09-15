import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Card de 1 documento dentro do painel da turma (Planejamento/Roteiro/
 * Atividade Gráfica/Tema Literário) — redesign v2, pedido do dono a partir
 * de um mockup de referência: borda colorida no TOPO (era na lateral),
 * badge de status sempre visível, barra de progresso quando fizer sentido,
 * botão de ação sólido no padrão do sistema (era uma pílula navy escrita à
 * mão — agora é o <Button> de verdade, herda o mesmo azul de todo botão
 * primário do ERP). Cor por tipo de documento continua categórica (não é
 * "status" no sentido de erro/sucesso), só Planejamento tem status real de
 * aprovação — ver pedagogico/page.tsx. */
export function DocumentoPedagogicoCard({
  icon: Icon,
  cor,
  titulo,
  statusLabel,
  linhas,
  progresso,
  prazo,
  impresso,
  href,
  external,
  acaoLabel,
}: {
  icon: LucideIcon;
  /** Token CSS, ex.: "var(--status-warning)" ou "var(--cat-2-dot)" — cor da
   * borda de cima e do badge. */
  cor: string;
  titulo: string;
  statusLabel: string;
  /** 1-2 linhas curtas de informação (progresso, "gerado do Planejamento",
   * disponibilidade) — cada string vira 1 linha. */
  linhas: string[];
  /** Barra de progresso — só quando fizer sentido pro documento (Roteiro/
   * Planejamento têm "N de M semanas"; Atividade Gráfica/Tema Literário,
   * sendo pontuais por dia, não têm um "total" fixo pra barrar). */
  progresso?: { atual: number; total: number };
  /** Linha de prazo colorida, abaixo da barra de progresso — só o
   * Planejamento tem (é o único documento com data limite definida pela
   * coordenadora); pedido do dono, o redesign v2 tinha perdido essa
   * informação. */
  prazo?: { texto: string; cor: string };
  /** true = a secretaria já marcou esse documento como impresso na Fila de
   * Impressão — mostra um badge "Impresso" abaixo do status (pedido do
   * dono, Fila de Impressão, out/2026: "a professora vê o status impresso
   * no card dela"). Omitido (undefined) = documento que a Fila de
   * Impressão não rastreia (não tem caso hoje, os 4 documentos têm). */
  impresso?: boolean;
  href: string;
  /** true = PDF/link externo (abre em nova aba); false = navegação interna. */
  external?: boolean;
  acaoLabel: string;
}) {
  const pct = progresso && progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  const conteudo = (
    <div className="flex h-full flex-col rounded-[10px] border border-cda-border bg-white p-4" style={{ borderTopWidth: 6, borderTopColor: cor }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-4 w-4 shrink-0" style={{ color: cor }} />
          <span className="truncate text-sm font-semibold text-cda-text">{titulo}</span>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}
        >
          {statusLabel}
        </span>
      </div>

      {impresso && (
        <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-cda-green/10 px-2 py-0.5 text-[11px] font-semibold text-cda-green">
          🖨️ Impresso
        </span>
      )}

      <div className="flex flex-1 flex-col gap-0.5">
        {linhas.map((linha, i) => (
          <span key={i} className="text-xs text-cda-text3">
            {linha}
          </span>
        ))}
      </div>

      {progresso && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cda-bg">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
        </div>
      )}

      {prazo && (
        <span className="mt-2 text-[11px] font-medium" style={{ color: prazo.cor }}>
          {prazo.texto}
        </span>
      )}

      {/* Visual do <Button> primário do sistema (bg-cda-blue, h-8, rounded-lg)
          sem ser um <button> de verdade — o card inteiro já é o link/`<a>`
          clicável (ver abaixo); aninhar um <button> dentro do <a> seria HTML
          inválido. Mesma solução que a versão anterior deste componente já
          usava (era uma pílula navy escrita à mão — só troca a cor/estilo
          pro padrão azul sólido do Button, pedido do dono). */}
      <span className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-cda-blue text-xs font-medium text-white">{acaoLabel}</span>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {conteudo}
      </a>
    );
  }
  return (
    <Link href={href} className="block h-full">
      {conteudo}
    </Link>
  );
}
