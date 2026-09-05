import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

/** Embarca o logo real da escola (fundo branco atrás pra garantir contraste com o cabeçalho navy). */
export async function embarcarLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "logo-cda.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

/** Embarca a arte oficial da campanha ("Fundamental para aprender e
 * crescer") em alta resolução — só cabe legível numa página inteira (no
 * cabeçalho fino ela virava bagunça colada no logo, por isso lá é texto
 * simples — ver desenharSlogan). */
export async function embarcarCampanha(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "campanha-2027.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

/** Página de capa com a arte da campanha — logo no topo, arte grande
 * centralizada, título do documento embaixo. Pensada pros documentos "de
 * vitrine" que costumam ser impressos ou compartilhados inteiros (Cardápio,
 * Horários da Equipe, Calendário), não pros relatórios de trabalho
 * (boletos, log de atividades etc.), onde uma capa de marketing ficaria
 * fora de lugar. Não conta como página numerada — é uma folha de rosto,
 * a numeração "página X/Y" dos relatórios continua batendo com o conteúdo
 * de verdade que vem depois dela. */
export function desenharCapa(
  pdf: PDFDocument,
  {
    logo,
    campanha,
    fonte,
    fonteBold,
    titulo,
    subtitulo,
    geradoEm,
  }: { logo: PDFImage | null; campanha: PDFImage | null; fonte: PDFFont; fonteBold: PDFFont; titulo: string; subtitulo?: string; geradoEm: string }
) {
  const pagina = pdf.addPage([PAGE_W, PAGE_H]);
  pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: WHITE });
  pagina.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 5, color: YELLOW });

  if (logo) {
    const alturaLogo = 42;
    const larguraLogo = (logo.width / logo.height) * alturaLogo;
    pagina.drawImage(logo, { x: (PAGE_W - larguraLogo) / 2, y: PAGE_H - 66, width: larguraLogo, height: alturaLogo });
  }

  if (campanha) {
    const larguraArte = 400;
    const alturaArte = (campanha.height / campanha.width) * larguraArte;
    const yArte = PAGE_H - 66 - 40 - alturaArte;
    pagina.drawImage(campanha, { x: (PAGE_W - larguraArte) / 2, y: yArte, width: larguraArte, height: alturaArte });
  }

  const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 22);
  const yTitulo = campanha ? 108 : PAGE_H / 2;
  pagina.drawText(titulo, { x: (PAGE_W - tituloLargura) / 2, y: yTitulo, size: 22, font: fonteBold, color: NAVY });

  if (subtitulo) {
    const subtituloLargura = fonte.widthOfTextAtSize(subtitulo, 12);
    pagina.drawText(subtitulo, { x: (PAGE_W - subtituloLargura) / 2, y: yTitulo - 22, size: 12, font: fonte, color: TEXT2 });
  }

  const rodape = `Escola CDA — Santa Maria, RS · Gerado em ${geradoEm}`;
  const rodapeLargura = fonte.widthOfTextAtSize(rodape, 9);
  pagina.drawText(rodape, { x: (PAGE_W - rodapeLargura) / 2, y: 36, size: 9, font: fonte, color: TEXT3 });
}

/** Desenha o logo no canto superior esquerdo do cabeçalho navy. O PNG já tem
 * fundo transparente e contorno branco embutido nas letras (dá contraste
 * sozinho) — sem caixa branca atrás, que ficava com cara de botão colado.
 * `alturaPagina` porque nem toda página usa a mesma altura (ficha é retrato).
 * Retorna a largura desenhada, pra quem chamar saber onde posicionar o que
 * vem a seguir (ex.: o selo da campanha, logo ao lado). */
export function desenharLogo(pagina: PDFPage, logo: PDFImage | null, alturaPagina: number): number {
  if (!logo) return 0;
  const alturaLogo = 30;
  const escala = alturaLogo / logo.height;
  const larguraLogo = logo.width * escala;
  const x = MARGIN;
  const y = alturaPagina - 16 - alturaLogo;
  pagina.drawImage(logo, { x, y, width: larguraLogo, height: alturaLogo });
  return larguraLogo;
}

/** Frase da campanha vigente (set/2026: "Fundamental para aprender e
 * crescer") — substitui "Onde, há 15 anos, família e escola sonham juntas"
 * (campanha anterior) em todo PDF do sistema. Testamos usar a arte oficial
 * da campanha aqui (public/campanha-2027.png) em vez de texto, mas ela tem 3
 * linhas de texto bem carregadas de detalhe — encolhida pro tamanho de uma
 * faixa de cabeçalho fica ilegível e com cara de bagunça colada no logo
 * (2 gráficos "pesados" de cor/contorno lado a lado). Texto simples resolve
 * sem esse problema; trocar de frase de novo no futuro é só mudar a string
 * abaixo. */
export function desenharSlogan(pagina: PDFPage, fonte: PDFFont, alturaPagina: number) {
  pagina.drawText("Fundamental para aprender e crescer.", {
    x: MARGIN,
    y: alturaPagina - 60,
    size: 8.5,
    font: fonte,
    color: rgb(0.75, 0.8, 0.9),
  });
}

export const NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
export const YELLOW = rgb(0xf5 / 255, 0xc4 / 255, 0);
export const BORDER = rgb(0xe2 / 255, 0xe8 / 255, 0xf2 / 255);
export const TEXT2 = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
export const TEXT3 = rgb(0x9a / 255, 0xaa / 255, 0xbe / 255);
const ROW_ALT = rgb(0xf5 / 255, 0xf8 / 255, 0xfc / 255);
export const WHITE = rgb(1, 1, 1);
export const BLACK = rgb(0.05, 0.08, 0.14);

export const PAGE_W = 842;
export const PAGE_H = 595;
export const MARGIN = 36;
export const HEADER_H = 66;
const ROW_H = 22;
const HEAD_ROW_H = 24;

export type ColunaRelatorio = { chave: string; label: string; largura: number };

/** Usada por TODA linha de TODO relatório tabular do sistema (funcionários,
 * alunos, boletos, notas fiscais, log de atividades…) — célula de tabela é
 * sempre uma linha só, então \r/\n (texto colado do Windows/Word, ex.: numa
 * observação) sempre pode aparecer aqui. Achado real (ago/2026): um \r
 * sozinho sobrando derrubava o PDF inteiro com "WinAnsi cannot encode"
 * (0x000d) — o pdf-lib não sabe desenhar caractere de controle. Removido
 * antes de qualquer cálculo de largura, não só no texto final. */
export function truncar(font: PDFFont, texto: string, tamanho: number, larguraMax: number): string {
  texto = texto.replace(/[\r\n]+/g, " ").trim();
  if (font.widthOfTextAtSize(texto, tamanho) <= larguraMax) return texto;
  let resultado = texto;
  while (resultado.length > 1 && font.widthOfTextAtSize(resultado + "…", tamanho) > larguraMax) {
    resultado = resultado.slice(0, -1);
  }
  return resultado + "…";
}

export async function gerarRelatorioPdf({
  titulo,
  subtitulo,
  colunas,
  linhas,
}: {
  titulo: string;
  subtitulo?: string;
  colunas: ColunaRelatorio[];
  linhas: Record<string, string>[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${titulo} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  const larguraTabela = colunas.reduce((acc, c) => acc + c.largura, 0);
  const escala = Math.min(1, (PAGE_W - MARGIN * 2) / larguraTabela);
  const colunasEscaladas = colunas.map((c) => ({ ...c, largura: c.largura * escala }));

  // O servidor roda em UTC — sem timeZone explícito, "Gerado em" saía com a
  // hora errada (3h a menos do horário de Brasília).
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - HEAD_ROW_H - 24) / ROW_H));
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / linhasPorPagina));

  function desenharCabecalho(pagina: PDFPage, numeroPagina: number) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    desenharLogo(pagina, logo, PAGE_H);
    desenharSlogan(pagina, fonte, PAGE_H);

    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, {
      x: PAGE_W - MARGIN - tituloLargura,
      y: PAGE_H - 28,
      size: 14,
      font: fonteBold,
      color: WHITE,
    });
    const geradoTexto = `Gerado em ${geradoEm} · página ${numeroPagina}/${totalPaginas}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura,
      y: PAGE_H - 44,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  function desenharCabecalhoTabela(pagina: PDFPage, y: number) {
    pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: larguraTabela * escala, height: HEAD_ROW_H, color: NAVY });
    let x = MARGIN;
    for (const col of colunasEscaladas) {
      pagina.drawText(truncar(fonteBold, col.label.toUpperCase(), 8, col.largura - 10), {
        x: x + 6,
        y: y - HEAD_ROW_H + 8,
        size: 8,
        font: fonteBold,
        color: WHITE,
      });
      x += col.largura;
    }
  }

  let pagina = pdf.addPage([PAGE_W, PAGE_H]);
  let paginaAtual = 1;
  desenharCabecalho(pagina, paginaAtual);

  if (subtitulo) {
    pagina.drawText(subtitulo, {
      x: MARGIN,
      y: PAGE_H - HEADER_H - 16,
      size: 10,
      font: fonte,
      color: TEXT2,
    });
  }

  let y = PAGE_H - HEADER_H - (subtitulo ? 30 : 16);
  desenharCabecalhoTabela(pagina, y);
  y -= HEAD_ROW_H;

  linhas.forEach((linha, i) => {
    const indiceNaPagina = i % linhasPorPagina;

    if (i > 0 && indiceNaPagina === 0) {
      pagina = pdf.addPage([PAGE_W, PAGE_H]);
      paginaAtual += 1;
      desenharCabecalho(pagina, paginaAtual);
      y = PAGE_H - HEADER_H - 16;
      desenharCabecalhoTabela(pagina, y);
      y -= HEAD_ROW_H;
    }

    if (indiceNaPagina % 2 === 1) {
      pagina.drawRectangle({ x: MARGIN, y: y - ROW_H, width: larguraTabela * escala, height: ROW_H, color: ROW_ALT });
    }

    let x = MARGIN;
    for (const col of colunasEscaladas) {
      const valor = truncar(fonte, linha[col.chave] ?? "", 9, col.largura - 12);
      pagina.drawText(valor, {
        x: x + 6,
        y: y - ROW_H + 7,
        size: 9,
        font: fonte,
        color: BLACK,
      });
      x += col.largura;
    }

    pagina.drawLine({
      start: { x: MARGIN, y: y - ROW_H },
      end: { x: MARGIN + larguraTabela * escala, y: y - ROW_H },
      thickness: 0.5,
      color: BORDER,
    });

    y -= ROW_H;
  });

  if (linhas.length === 0) {
    pagina.drawText("Nenhum registro encontrado.", {
      x: MARGIN + 6,
      y: y - ROW_H + 7,
      size: 9,
      font: fonte,
      color: TEXT3,
    });
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

export type SecaoRelatorio = {
  titulo: string;
  subtitulo?: string;
  colunas: ColunaRelatorio[];
  linhas: Record<string, string>[];
};

/** Mesmo visual do gerarRelatorioPdf, mas com várias seções (cada uma com sua própria
 * tabela/colunas), sempre começando em página nova pra ficar bem separado. */
export async function gerarRelatorioPdfMultiSecao({
  titulo,
  secoes,
}: {
  titulo: string;
  secoes: SecaoRelatorio[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${titulo} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  // O servidor roda em UTC — sem timeZone explícito, "Gerado em" saía com a
  // hora errada (3h a menos do horário de Brasília).
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // Cada seção ocupa pelo menos 1 página, então o total é a soma de páginas por seção.
  const paginasPorSecao = secoes.map((secao) => {
    const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - 40 - HEAD_ROW_H - 24) / ROW_H));
    return Math.max(1, Math.ceil(secao.linhas.length / linhasPorPagina));
  });
  const totalPaginas = paginasPorSecao.reduce((a, b) => a + b, 0);
  let paginaAtual = 0;

  function desenharCabecalho(pagina: PDFPage, tituloSecao: string) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    desenharLogo(pagina, logo, PAGE_H);
    desenharSlogan(pagina, fonte, PAGE_H);

    const tituloCompleto = `${titulo} · ${tituloSecao}`;
    const tituloLargura = fonteBold.widthOfTextAtSize(tituloCompleto, 14);
    pagina.drawText(tituloCompleto, {
      x: PAGE_W - MARGIN - tituloLargura,
      y: PAGE_H - 28,
      size: 14,
      font: fonteBold,
      color: WHITE,
    });
    const geradoTexto = `Gerado em ${geradoEm} · página ${paginaAtual}/${totalPaginas}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura,
      y: PAGE_H - 44,
      size: 8.5,
      font: fonte,
      color: rgb(0.75, 0.8, 0.9),
    });
  }

  for (const secao of secoes) {
    const larguraTabela = secao.colunas.reduce((acc, c) => acc + c.largura, 0);
    const escala = Math.min(1, (PAGE_W - MARGIN * 2) / larguraTabela);
    const colunasEscaladas = secao.colunas.map((c) => ({ ...c, largura: c.largura * escala }));
    const linhasPorPagina = Math.max(1, Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - 40 - HEAD_ROW_H - 24) / ROW_H));

    function desenharCabecalhoTabela(pagina: PDFPage, y: number) {
      pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: larguraTabela * escala, height: HEAD_ROW_H, color: NAVY });
      let x = MARGIN;
      for (const col of colunasEscaladas) {
        pagina.drawText(truncar(fonteBold, col.label.toUpperCase(), 8, col.largura - 10), {
          x: x + 6,
          y: y - HEAD_ROW_H + 8,
          size: 8,
          font: fonteBold,
          color: WHITE,
        });
        x += col.largura;
      }
    }

    paginaAtual += 1;
    let pagina = pdf.addPage([PAGE_W, PAGE_H]);
    desenharCabecalho(pagina, secao.titulo);

    if (secao.subtitulo) {
      pagina.drawText(secao.subtitulo, { x: MARGIN, y: PAGE_H - HEADER_H - 16, size: 10, font: fonte, color: TEXT2 });
    }

    let y = PAGE_H - HEADER_H - (secao.subtitulo ? 30 : 16);
    desenharCabecalhoTabela(pagina, y);
    y -= HEAD_ROW_H;

    secao.linhas.forEach((linha, i) => {
      const indiceNaPagina = i % linhasPorPagina;

      if (i > 0 && indiceNaPagina === 0) {
        paginaAtual += 1;
        pagina = pdf.addPage([PAGE_W, PAGE_H]);
        desenharCabecalho(pagina, secao.titulo);
        y = PAGE_H - HEADER_H - 16;
        desenharCabecalhoTabela(pagina, y);
        y -= HEAD_ROW_H;
      }

      if (indiceNaPagina % 2 === 1) {
        pagina.drawRectangle({ x: MARGIN, y: y - ROW_H, width: larguraTabela * escala, height: ROW_H, color: ROW_ALT });
      }

      let x = MARGIN;
      for (const col of colunasEscaladas) {
        const valor = truncar(fonte, linha[col.chave] ?? "", 9, col.largura - 12);
        pagina.drawText(valor, { x: x + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: BLACK });
        x += col.largura;
      }

      pagina.drawLine({
        start: { x: MARGIN, y: y - ROW_H },
        end: { x: MARGIN + larguraTabela * escala, y: y - ROW_H },
        thickness: 0.5,
        color: BORDER,
      });

      y -= ROW_H;
    });

    if (secao.linhas.length === 0) {
      pagina.drawText("Nenhum registro encontrado.", { x: MARGIN + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: TEXT3 });
    }
  }

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

/** Mesmo visual do gerarRelatorioPdf, mas com várias seções empilhadas NA MESMA página
 * (uma tabela embaixo da outra) — só quebra de página se o conteúdo realmente não couber. */
export async function gerarRelatorioPdfSecoesEmpilhadas({
  titulo,
  subtitulo,
  secoes,
}: {
  titulo: string;
  subtitulo?: string;
  secoes: SecaoRelatorio[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${titulo} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);

  // O servidor roda em UTC — sem timeZone explícito, "Gerado em" saía com a
  // hora errada (3h a menos do horário de Brasília).
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  let paginaAtual = 1;
  let totalPaginas = 1;

  function desenharCabecalho(pagina: PDFPage) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    desenharLogo(pagina, logo, PAGE_H);
    desenharSlogan(pagina, fonte, PAGE_H);

    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, { x: PAGE_W - MARGIN - tituloLargura, y: PAGE_H - 28, size: 14, font: fonteBold, color: WHITE });
    const geradoTexto = `Gerado em ${geradoEm} · página ${paginaAtual}/${totalPaginas}`;
    const geradoLargura = fonte.widthOfTextAtSize(geradoTexto, 8.5);
    pagina.drawText(geradoTexto, {
      x: PAGE_W - MARGIN - geradoLargura, y: PAGE_H - 44, size: 8.5, font: fonte, color: rgb(0.75, 0.8, 0.9),
    });
  }

  // 16pt aqui deixava o título da 1ª seção (ex.: "Maternal I") quase colado
  // na borda do cabeçalho navy — o ascent de um texto bold de 12pt já come
  // boa parte disso. 24pt dá um respiro visível de verdade.
  let pagina = pdf.addPage([PAGE_W, PAGE_H]);
  desenharCabecalho(pagina);
  let y = PAGE_H - HEADER_H - 24;

  if (subtitulo) {
    pagina.drawText(subtitulo, { x: MARGIN, y, size: 10, font: fonte, color: TEXT2 });
    y -= 22;
  }

  function novaPagina() {
    pagina = pdf.addPage([PAGE_W, PAGE_H]);
    paginaAtual += 1;
    totalPaginas = paginaAtual;
    desenharCabecalho(pagina);
    y = PAGE_H - HEADER_H - 24;
  }

  for (const secao of secoes) {
    const larguraTabela = secao.colunas.reduce((acc, c) => acc + c.largura, 0);
    const escala = Math.min(1, (PAGE_W - MARGIN * 2) / larguraTabela);
    const colunasEscaladas = secao.colunas.map((c) => ({ ...c, largura: c.largura * escala }));

    // Título da seção + espaço mínimo pra pelo menos o cabeçalho da tabela + 1 linha.
    if (y - 20 - HEAD_ROW_H - ROW_H < MARGIN) novaPagina();

    pagina.drawText(secao.titulo, { x: MARGIN, y, size: 12, font: fonteBold, color: NAVY });
    if (secao.subtitulo) {
      const largura = fonteBold.widthOfTextAtSize(secao.titulo, 12);
      pagina.drawText(secao.subtitulo, { x: MARGIN + largura + 10, y: y + 1, size: 9, font: fonte, color: TEXT2 });
    }
    y -= 20;

    pagina.drawRectangle({ x: MARGIN, y: y - HEAD_ROW_H, width: larguraTabela * escala, height: HEAD_ROW_H, color: NAVY });
    let xCab = MARGIN;
    for (const col of colunasEscaladas) {
      pagina.drawText(truncar(fonteBold, col.label.toUpperCase(), 8, col.largura - 10), {
        x: xCab + 6, y: y - HEAD_ROW_H + 8, size: 8, font: fonteBold, color: WHITE,
      });
      xCab += col.largura;
    }
    y -= HEAD_ROW_H;

    secao.linhas.forEach((linha, i) => {
      if (y - ROW_H < MARGIN) novaPagina();

      if (i % 2 === 1) {
        pagina.drawRectangle({ x: MARGIN, y: y - ROW_H, width: larguraTabela * escala, height: ROW_H, color: ROW_ALT });
      }
      let x = MARGIN;
      for (const col of colunasEscaladas) {
        const valor = truncar(fonte, linha[col.chave] ?? "", 9, col.largura - 12);
        pagina.drawText(valor, { x: x + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: BLACK });
        x += col.largura;
      }
      pagina.drawLine({
        start: { x: MARGIN, y: y - ROW_H },
        end: { x: MARGIN + larguraTabela * escala, y: y - ROW_H },
        thickness: 0.5,
        color: BORDER,
      });
      y -= ROW_H;
    });

    if (secao.linhas.length === 0) {
      pagina.drawText("Nenhum registro encontrado.", { x: MARGIN + 6, y: y - ROW_H + 7, size: 9, font: fonte, color: TEXT3 });
      y -= ROW_H;
    }

    y -= 20; // espaço entre seções
  }

  // Repassa o número de página em todos os cabeçalhos já desenhados (agora que sabemos o total).
  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

/** Nome "profissional" pra baixar: "Nome Do Documento - Alguma Coisa.pdf", sem
 * embromation tipo "ficha_matricula_joao_silva.pdf" — é a primeira coisa que a
 * pessoa vê na pasta de Downloads, tem que dar pra saber o que é sem abrir. */
export function nomeArquivoPdf(...partes: (string | number | null | undefined)[]): string {
  const texto = partes.filter(Boolean).join(" - ");
  return `${texto}.pdf`;
}

export function respostaPDF(dataUri: string, nomeArquivo: string): Response {
  const base64 = dataUri.split(",")[1] ?? dataUri;
  const bytes = Buffer.from(base64, "base64");
  // Acento no nome do arquivo quebra em navegador/servidor mais antigo se for só
  // "filename=" cru — manda os dois: um "filename" sem acento (fallback) e o
  // "filename*" com o nome de verdade, codificado (é o jeito certo, RFC 5987).
  const semAcento = nomeArquivo.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${semAcento}"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
