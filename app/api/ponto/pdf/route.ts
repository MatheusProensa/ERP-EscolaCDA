import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { comSaldos, formatarMinutos } from "@/lib/ponto";

const NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const BLUE = rgb(0x1a / 255, 0x6f / 255, 0xd8 / 255);
const GRAY = rgb(0.45, 0.47, 0.52);
const LIGHT = rgb(0.95, 0.96, 0.98);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.83, 0.18, 0.18);

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

const COLS = [
  { label: "Data", width: 65 },
  { label: "Entrada", width: 55 },
  { label: "Saída", width: 55 },
  { label: "Entrada", width: 55 },
  { label: "Saída", width: 55 },
  { label: "Ocorrência", width: 75 },
  { label: "Horas", width: 55 },
  { label: "Previsto", width: 55 },
  { label: "Saldo dia", width: 60 },
  { label: "Saldo acum.", width: 65 },
];

const OCORRENCIA_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  FALTA: "Falta",
  FERIADO: "Feriado",
  FERIAS: "Férias",
  ATESTADO: "Atestado",
  FOLGA: "Folga",
  DSR: "DSR",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const funcionarioId = req.nextUrl.searchParams.get("funcionarioId");
  const mes = req.nextUrl.searchParams.get("mes");
  const ano = req.nextUrl.searchParams.get("ano");
  if (!funcionarioId) return NextResponse.json({ error: "funcionarioId é obrigatório" }, { status: 400 });

  const funcionarioEncontrado = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionarioEncontrado) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  const funcionario = funcionarioEncontrado;

  const todos = await prisma.registroPonto.findMany({ where: { funcionarioId }, orderBy: { data: "asc" } });
  const comSaldo = comSaldos(todos);

  const filtrados = comSaldo.filter((r) => {
    if (ano && r.data.getUTCFullYear() !== Number(ano)) return false;
    if (mes && r.data.getUTCMonth() + 1 !== Number(mes)) return false;
    return true;
  });

  const doc = await PDFDocument.create();
  doc.setTitle(`Espelho de Ponto - ${funcionario.nome}`);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 841.89; // A4 landscape
  const PAGE_H = 595.28;
  const MARGIN = 32;
  const tableWidth = COLS.reduce((s, c) => s + c.width, 0);
  const tableX = (PAGE_W - tableWidth) / 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  function novaPagina() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H;
    desenharCabecalho();
    desenharCabecalhoTabela();
  }

  function desenharCabecalho() {
    page.drawRectangle({ x: 0, y: y - 64, width: PAGE_W, height: 64, color: NAVY });
    page.drawText("Escola CDA", { x: MARGIN, y: y - 30, size: 18, font: fontBold, color: WHITE });
    page.drawText("Espelho de Ponto", { x: MARGIN, y: y - 48, size: 10, font: fontRegular, color: rgb(0.8, 0.85, 0.95) });

    const periodo = mes && ano ? `${mes.padStart(2, "0")}/${ano}` : "Histórico completo";
    const linhaDireita = [
      { label: funcionario.nome, bold: true },
      { label: `${funcionario.cargo}${funcionario.empresa ? " · " + funcionario.empresa : ""}` },
      { label: `Período: ${periodo}` },
    ];
    let ty = y - 22;
    for (const l of linhaDireita) {
      const f = l.bold ? fontBold : fontRegular;
      const size = l.bold ? 12 : 9;
      const w = f.widthOfTextAtSize(l.label, size);
      page.drawText(l.label, { x: PAGE_W - MARGIN - w, y: ty, size, font: f, color: WHITE });
      ty -= 14;
    }

    y -= 64 + 20;
  }

  function desenharCabecalhoTabela() {
    let x = tableX;
    page.drawRectangle({ x: tableX, y: y - 20, width: tableWidth, height: 20, color: BLUE });
    for (const col of COLS) {
      page.drawText(col.label, { x: x + 4, y: y - 14, size: 8, font: fontBold, color: WHITE });
      x += col.width;
    }
    y -= 20;
  }

  desenharCabecalho();
  desenharCabecalhoTabela();

  let totalTrabalhado = 0;
  let totalPrevisto = 0;
  let index = 0;

  for (const r of filtrados) {
    if (y < MARGIN + 40) novaPagina();

    const rowH = 18;
    if (index % 2 === 0) {
      page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: LIGHT });
    }

    const valores = [
      formatarData(r.data),
      r.entrada1 ?? "-",
      r.saida1 ?? "-",
      r.entrada2 ?? "-",
      r.saida2 ?? "-",
      OCORRENCIA_LABEL[r.ocorrencia] ?? r.ocorrencia,
      formatarMinutos(r.minutosTrabalhados),
      formatarMinutos(r.minutosPrevistos),
      formatarMinutos(r.saldoDiario),
      formatarMinutos(r.saldoAcumulado),
    ];

    let x = tableX;
    for (let i = 0; i < COLS.length; i++) {
      const isSaldo = i === 8 || i === 9;
      const negativo = isSaldo && valores[i].startsWith("-");
      page.drawText(valores[i], {
        x: x + 4,
        y: y - 13,
        size: 8,
        font: fontRegular,
        color: negativo ? RED : GRAY,
      });
      x += COLS[i].width;
    }

    totalTrabalhado += r.minutosTrabalhados;
    totalPrevisto += r.minutosPrevistos;
    y -= rowH;
    index++;
  }

  if (filtrados.length === 0) {
    page.drawText("Nenhum registro de ponto neste período.", { x: tableX, y: y - 16, size: 9, font: fontRegular, color: GRAY });
    y -= 24;
  }

  y -= 16;
  page.drawRectangle({ x: tableX, y: y - 24, width: tableWidth, height: 24, color: NAVY });
  const saldoFinal = totalTrabalhado - totalPrevisto;
  const resumo = `Total trabalhado: ${formatarMinutos(totalTrabalhado)}   ·   Previsto: ${formatarMinutos(totalPrevisto)}   ·   Saldo do período: ${formatarMinutos(saldoFinal)}`;
  page.drawText(resumo, { x: tableX + 8, y: y - 16, size: 9, font: fontBold, color: WHITE });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ponto-${funcionario.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
