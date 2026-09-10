import { rgb, type PDFPage } from "pdf-lib";

/**
 * Formas arredondadas pra pdf-lib (que só desenha retângulo de canto reto
 * nativamente) — via SVG path, reaproveitado entre os geradores de PDF que
 * usam o visual "pôster" (navy + amarelo + cartão branco arredondado):
 * lib/gerarCalendarioPdf.ts e lib/gerarCardapioPdf.ts.
 */

/** Caminho SVG (origem no canto superior-esquerdo, Y pra baixo — convenção
 * SVG, que é o que page.drawSvgPath espera) de um retângulo com os 4 cantos
 * arredondados. */
export function retanguloArredondadoPath(w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${raio},0 H ${w - raio} Q ${w},0 ${w},${raio} V ${h - raio} Q ${w},${h} ${w - raio},${h} H ${raio} Q 0,${h} 0,${h - raio} V ${raio} Q 0,0 ${raio},0 Z`;
}

/** Igual ao anterior, mas só os cantos de CIMA são arredondados (base reta)
 * — usado em cabeçalhos coloridos colados numa área branca embaixo. */
export function retanguloTopoArredondadoPath(w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h));
  return `M 0,${raio} Q 0,0 ${raio},0 H ${w - raio} Q ${w},0 ${w},${raio} V ${h} H 0 V ${raio} Z`;
}

export function desenharRetanguloArredondado(
  pagina: PDFPage,
  { x, yTopo, largura, altura, raio, color, opacity }: { x: number; yTopo: number; largura: number; altura: number; raio: number; color: ReturnType<typeof rgb>; opacity?: number }
) {
  pagina.drawSvgPath(retanguloArredondadoPath(largura, altura, raio), { x, y: yTopo, color, opacity });
}

/** Pílula (retângulo com os cantos totalmente arredondados) — chip de
 * legenda, destaque de dia com evento etc. */
export function desenharPilula(
  pagina: PDFPage,
  { x, yTopo, largura, altura, color }: { x: number; yTopo: number; largura: number; altura: number; color: ReturnType<typeof rgb> }
) {
  desenharRetanguloArredondado(pagina, { x, yTopo, largura, altura, raio: altura / 2, color });
}
