import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatarData } from "@/lib/utils";
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
  turnoLabel: "Manhã" | "Tarde" | "Integral" | "Contraturno";
  anoLetivo: number;
  valorMensalidade: number;
  dataMatricula: Date;
};

const AZUL_NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842; // A4
const MARGEM = 56;
const RODAPE = 40;

export async function gerarContratoPdf(dados: DadosContrato): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - 56;

  function novaPagina() {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - 56;
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

  function paragrafo(texto: string, opts?: { tamanho?: number; negrito?: boolean; justificado?: boolean }) {
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

  // Cabeçalho institucional (só primeira página)
  linha("ESCOLA CDA", { negrito: true, tamanho: 16, cor: AZUL_NAVY, espacoDepois: 2 });
  linha("Onde, há 15 anos, família e escola sonham juntas", { tamanho: 9, cor: CINZA, espacoDepois: 20 });
  linha(`CONTRATO DE SERVIÇOS EDUCACIONAIS ${dados.anoLetivo}`, { negrito: true, tamanho: 12, espacoDepois: 16 });

  // Identificação (a "ficha de matrícula" do papel — aqui vem de dentro do sistema)
  linha(`Aluno(a): ${dados.alunoNome}`, { espacoDepois: 3 });
  linha(`Data de nascimento: ${formatarData(dados.alunoDataNascimento)}`, { espacoDepois: 3 });
  linha(`Turma: ${dados.turmaNome}`, { espacoDepois: 3 });
  linha(`CONTRATANTE (responsável): ${dados.responsavelNome}`, { espacoDepois: 3 });
  linha(`CPF do CONTRATANTE: ${dados.responsavelCpf ?? "não informado"}`, { espacoDepois: 3 });
  linha(`Data da matrícula: ${formatarData(dados.dataMatricula)}`, { espacoDepois: 18 });

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
