import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { montarClausulas } from "@/lib/contratoTexto";

export type DadosContrato = {
  alunoNome: string;
  alunoDataNascimento: Date;
  responsavelNome: string;
  responsavelCpf: string | null;
  turmaNome: string;
  /** MANHA/TARDE (Turma.turno) — só um dos 3 turnos do contrato real (o outro,
   * "Integral", não existe como campo próprio ainda; ver observação no fim do
   * arquivo). Passar aqui já resolvido pro rótulo certo evita import circular. */
  turnoLabel: "Tarde" | "Integral" | "Contraturno";
  anoLetivo: number;
  valorMensalidade: number;
  dataMatricula: Date;
};

const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842; // A4
const MARGEM = 54;
// O papel timbrado (mesmo arquivo usado na Ficha de Matrícula) já traz o cabeçalho com logo e o
// rodapé com endereço/telefone desenhados na imagem — o conteúdo entra só na área branca do meio.
const TOPO_CONTEUDO = ALTURA - 130;
const RODAPE = 55;

/** Mesmo timbrado real da escola usado na Ficha de Matrícula (lib/gerarFichaMatriculaPdf) —
 * é o mesmo arquivo, um documento oficial não tem cabeçalho diferente do outro. */
async function embarcarFundo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "ficha-matricula-fundo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function gerarContratoPdf(dados: DadosContrato): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fundo = await embarcarFundo(pdf);

  function desenharFundo(p: import("pdf-lib").PDFPage) {
    // Overscan de 4pt à esquerda: o PNG tem uma sobra branca de uns px só nesse lado
    // (artefato da exportação original), empurra ela pra fora da página.
    if (fundo) p.drawImage(fundo, { x: -4, y: 0, width: LARGURA + 4, height: ALTURA });
  }

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  desenharFundo(pagina);
  let y = TOPO_CONTEUDO;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    desenharFundo(pagina);
    y = TOPO_CONTEUDO;
  }

  function garantirEspaco(alturaNecessaria: number) {
    if (y - alturaNecessaria < RODAPE) novaPagina();
  }

  function linha(texto: string, opts?: { negrito?: boolean; tamanho?: number; cor?: ReturnType<typeof rgb>; espacoDepois?: number }) {
    const tamanho = opts?.tamanho ?? 10.5;
    garantirEspaco(tamanho);
    pagina.drawText(texto, {
      x: MARGEM,
      y,
      size: tamanho,
      font: opts?.negrito ? fonteNegrito : fonte,
      color: opts?.cor ?? PRETO,
    });
    y -= tamanho + (opts?.espacoDepois ?? 8);
  }

  function quebrarLinhas(texto: string, tamanho: number, fonteUsada: PDFFont): string[] {
    const larguraMax = LARGURA - MARGEM * 2;
    const palavras = texto.split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fonteUsada.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function paragrafo(texto: string, opts?: { tamanho?: number; negrito?: boolean }) {
    const tamanho = opts?.tamanho ?? 10;
    const fonteUsada = opts?.negrito ? fonteNegrito : fonte;
    const linhas = quebrarLinhas(texto, tamanho, fonteUsada);
    for (const l of linhas) {
      garantirEspaco(tamanho);
      pagina.drawText(l, { x: MARGEM, y, size: tamanho, font: fonteUsada });
      y -= tamanho + 3;
    }
    y -= 9;
  }

  // Título (o cabeçalho com logo já vem do papel timbrado de fundo)
  linha(`CONTRATO DE SERVIÇOS EDUCACIONAIS ${dados.anoLetivo}`, { negrito: true, tamanho: 13, espacoDepois: 16 });

  // Identificação (a "ficha de matrícula" do papel — aqui vem de dentro do sistema)
  linha(`Aluno(a): ${dados.alunoNome}`, { espacoDepois: 3 });
  linha(`Data de nascimento: ${formatarData(dados.alunoDataNascimento)}`, { espacoDepois: 3 });
  linha(`Turma: ${dados.turmaNome} (${dados.turnoLabel})`, { espacoDepois: 3 });
  linha(`CONTRATANTE (responsável): ${dados.responsavelNome}`, { espacoDepois: 3 });
  linha(`CPF do CONTRATANTE: ${dados.responsavelCpf ?? "não informado"}`, { espacoDepois: 3 });
  linha(`Data da matrícula: ${formatarData(dados.dataMatricula)}`, { espacoDepois: 3 });
  linha(`Valor da mensalidade: ${formatarMoeda(dados.valorMensalidade)}`, { espacoDepois: 18 });

  for (const c of montarClausulas(dados)) paragrafo(c);

  y -= 20;
  garantirEspaco(70);
  linha(`Santa Maria - RS, ${formatarData(new Date())}.`, { espacoDepois: 40 });

  garantirEspaco(60);
  linha("_____________________________________          _____________________________________", { espacoDepois: 4 });
  const xEsquerda = MARGEM + 60;
  const xDireita = MARGEM + 300;
  pagina.drawText("CONTRATANTE", { x: xEsquerda, y, size: 9, font: fonte, color: CINZA });
  pagina.drawText("CONTRATADA", { x: xDireita, y, size: 9, font: fonte, color: CINZA });
  y -= 24;

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

// NOTA: o contrato real distingue 3 turnos (Integral / Contraturno / Tarde),
// mas o schema hoje só tem Turma.turno = MANHA | TARDE. Enquanto isso não for
// modelado à parte, quem chama gerarContratoPdf() decide o turnoLabel (ex.:
// pelo nome da turma conter "integral"/"contraturno"). Ver app/api/contratos/route.ts.
