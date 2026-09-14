import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Card de 1 documento dentro do painel da turma (Planejamento/Roteiro/
 * Atividade Gráfica/Tema Literário) — barra colorida na lateral, ícone,
 * pílula de status e botão sólido no canto (pedido do dono, set/2026, a
 * partir de um mockup de referência: "faz parecido", só que nas cores da
 * CDA — status usa as cores de status do sistema (verde/laranja/vermelho/
 * azul), os 3 documentos gerados usam cor categórica por tipo, não status
 * inventado). */
export function DocumentoPedagogicoCard({
  icon: Icon,
  cor,
  titulo,
  statusLabel,
  subtitulo,
  href,
  external,
  acaoLabel,
}: {
  icon: LucideIcon;
  /** Token CSS, ex.: "var(--status-success)" ou "var(--cat-2-dot)". */
  cor: string;
  titulo: string;
  /** Pílula de status — só o Planejamento tem (os outros 3 não têm status
   * próprio, são gerados). */
  statusLabel?: string;
  subtitulo: string;
  href: string;
  /** true = PDF/link externo (abre em nova aba); false = navegação interna. */
  external?: boolean;
  acaoLabel: string;
}) {
  const conteudo = (
    <div
      className="flex h-full flex-col rounded-[10px] border border-cda-border bg-white p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: cor }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" style={{ color: cor }} />
        <span className="text-sm font-semibold text-cda-text">{titulo}</span>
      </div>
      {statusLabel && (
        <span
          className="mb-2 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}
        >
          {statusLabel}
        </span>
      )}
      <span className="text-xs text-cda-text3">{subtitulo}</span>
      <div className="mt-3 flex justify-end">
        <span className="rounded-md bg-cda-navy px-3 py-1.5 text-xs font-semibold text-white">{acaoLabel}</span>
      </div>
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
