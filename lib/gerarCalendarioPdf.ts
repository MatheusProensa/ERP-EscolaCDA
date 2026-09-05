import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import {
  embarcarLogo,
  desenharLogo,
  embarcarCampanha,
  desenharCampanha,
  truncar,
  NAVY,
  YELLOW,
  BORDER,
  TEXT2,
  TEXT3,
  WHITE,
  BLACK,
  PAGE_W,
  PAGE_H,
  MARGIN,
  HEADER_H,
} from "@/lib/gerarRelatorioPdf";
import { CATEGORIAS_EVENTO, DIAS_SEMANA_ABREV, MESES, corCategoria, gerarGradeMes } from "@/lib/calendario";

function hexParaRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export type EventoLevePdf = { titulo: string; categoria: string; data: Date };

const LINHAS_GRADE = 6;
const COLUNAS_GRADE = 7;
const LEGENDA_H = 26;

export async function gerarCalendarioPdf({
  meses,
  eventosPorMes,
}: {
  meses: { ano: number; mes: number }[];
  eventosPorMes: Map<string, EventoLevePdf[]>;
}): Promise<string> {
  const pdf = await PDFDocument.create();
  const primeiroMes = meses[0];
  pdf.setTitle(`Calendário — ${MESES[primeiroMes.mes - 1]} ${primeiroMes.ano} — Escola CDA`);
  pdf.setAuthor("Escola CDA");
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embarcarLogo(pdf);
  const campanha = await embarcarCampanha(pdf);

  const geradoEm = new Date().toLocaleString("pt-BR");
  const totalPaginas = meses.length;

  function desenharCabecalho(pagina: PDFPage, tituloMes: string, numeroPagina: number) {
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: NAVY });
    pagina.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: YELLOW });

    const larguraLogo = desenharLogo(pagina, logo, PAGE_H);
    desenharCampanha(pagina, campanha, PAGE_H, larguraLogo);

    const titulo = `Calendário — ${tituloMes}`;
    const tituloLargura = fonteBold.widthOfTextAtSize(titulo, 14);
    pagina.drawText(titulo, { x: PAGE_W - MARGIN - tituloLargura, y: PAGE_H - 28, size: 14, font: fonteBold, color: WHITE });
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

  function desenharLegenda(pagina: PDFPage) {
    let x = MARGIN;
    const y = MARGIN - 6;
    for (const categoria of CATEGORIAS_EVENTO) {
      const cor = corCategoria(categoria);
      pagina.drawCircle({ x: x + 3, y: y + 3, size: 3, color: hexParaRgb(cor.dot) });
      pagina.drawText(categoria, { x: x + 10, y, size: 7.5, font: fonte, color: TEXT2 });
      x += fonte.widthOfTextAtSize(categoria, 7.5) + 28;
    }
  }

  meses.forEach(({ ano, mes }, indice) => {
    const pagina = pdf.addPage([PAGE_W, PAGE_H]);
    const tituloMes = `${MESES[mes - 1]}/${ano}`;
    desenharCabecalho(pagina, tituloMes, indice + 1);

    const grade = gerarGradeMes(ano, mes);
    const eventos = eventosPorMes.get(`${ano}-${mes}`) ?? [];
    const eventosPorDia = new Map<string, EventoLevePdf[]>();
    for (const e of eventos) {
      const chave = e.data.toISOString().slice(0, 10);
      const lista = eventosPorDia.get(chave) ?? [];
      lista.push(e);
      eventosPorDia.set(chave, lista);
    }

    const topoGrade = PAGE_H - HEADER_H - 16;
    const alturaDisponivel = topoGrade - MARGIN - LEGENDA_H;
    const larguraCelula = (PAGE_W - MARGIN * 2) / COLUNAS_GRADE;
    const alturaCabecalhoSemana = 16;
    const alturaCelula = (alturaDisponivel - alturaCabecalhoSemana) / LINHAS_GRADE;

    // Cabeçalho dos dias da semana
    DIAS_SEMANA_ABREV.forEach((dia, i) => {
      const x = MARGIN + i * larguraCelula;
      pagina.drawRectangle({ x, y: topoGrade - alturaCabecalhoSemana, width: larguraCelula, height: alturaCabecalhoSemana, color: NAVY });
      const largura = fonteBold.widthOfTextAtSize(dia.toUpperCase(), 7.5);
      pagina.drawText(dia.toUpperCase(), {
        x: x + (larguraCelula - largura) / 2,
        y: topoGrade - alturaCabecalhoSemana + 5,
        size: 7.5,
        font: fonteBold,
        color: WHITE,
      });
    });

    grade.forEach(({ data, doMesAtual }, i) => {
      const col = i % COLUNAS_GRADE;
      const linha = Math.floor(i / COLUNAS_GRADE);
      const x = MARGIN + col * larguraCelula;
      const yTopo = topoGrade - alturaCabecalhoSemana - linha * alturaCelula;

      pagina.drawRectangle({
        x,
        y: yTopo - alturaCelula,
        width: larguraCelula,
        height: alturaCelula,
        color: doMesAtual ? WHITE : rgb(0.97, 0.98, 0.99),
        borderColor: BORDER,
        borderWidth: 0.5,
      });

      pagina.drawText(String(data.getUTCDate()), {
        x: x + 4,
        y: yTopo - 11,
        size: 8,
        font: fonteBold,
        color: doMesAtual ? BLACK : TEXT3,
      });

      const chave = data.toISOString().slice(0, 10);
      const eventosDoDia = eventosPorDia.get(chave) ?? [];
      const maxLinhas = Math.max(0, Math.floor((alturaCelula - 16) / 9));
      eventosDoDia.slice(0, maxLinhas).forEach((e, j) => {
        const cor = corCategoria(e.categoria);
        const yLinha = yTopo - 20 - j * 9;
        pagina.drawRectangle({ x: x + 3, y: yLinha - 6, width: larguraCelula - 6, height: 8, color: hexParaRgb(cor.bg) });
        pagina.drawText(truncar(fonte, e.titulo, 6.5, larguraCelula - 10), {
          x: x + 5,
          y: yLinha - 4.5,
          size: 6.5,
          font: fonte,
          color: hexParaRgb(cor.text),
        });
      });
      if (eventosDoDia.length > maxLinhas) {
        pagina.drawText(`+${eventosDoDia.length - maxLinhas}`, {
          x: x + 4,
          y: yTopo - alturaCelula + 4,
          size: 6,
          font: fonteBold,
          color: TEXT3,
        });
      }
    });

    desenharLegenda(pagina);
  });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
