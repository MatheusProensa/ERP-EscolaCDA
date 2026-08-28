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
  diaVencimento: string;
  mesInicioVencimento: string;
  /** Presente só depois que o responsável assina pelo link (ver app/assinar/[token]) —
   * troca a linha de assinatura em branco por um carimbo com quem assinou e quando. */
  assinatura?: {
    nome: string;
    cpf: string | null;
    dataHora: Date;
  } | null;
};

const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);
const PRETO = rgb(0, 0, 0);

const LARGURA = 595;
const ALTURA = 842; // A4
const MARGEM = 54;
// O timbrado novo (pedido do dono da escola, ago/2026) não tem mais o rodapé com
// endereço/telefone/@ desenhado na própria imagem — esse texto é desenhado aqui por
// cima do fundo agora, pra essa informação não sumir dos documentos.
const TEXTO_RODAPE = "Educação Infantil e Ensino Fundamental  ·  R. José Manhago, 194 - Camobi, Santa Maria - RS  ·  (55) 3217-7947  ·  @escolacda.sm";
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
    const tamanhoRodape = 7;
    const larguraRodape = fonte.widthOfTextAtSize(TEXTO_RODAPE, tamanhoRodape);
    p.drawText(TEXTO_RODAPE, { x: (LARGURA - larguraRodape) / 2, y: 24, size: tamanhoRodape, font: fonte, color: CINZA });
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
  linha(`Valor da mensalidade: ${dados.valorMensalidade > 0 ? formatarMoeda(dados.valorMensalidade) : "a definir"}`, {
    espacoDepois: 18,
  });

  for (const c of montarClausulas(dados)) paragrafo(c);

  y -= 20;
  garantirEspaco(70);
  linha(`Santa Maria - RS, ${formatarData(new Date())}.`, { espacoDepois: 40 });

  if (dados.assinatura) {
    // Assinado pelo link — carimbo no lugar da linha em branco (ver app/assinar/[token]).
    garantirEspaco(80);
    pagina.drawRectangle({
      x: MARGEM,
      y: y - 66,
      width: LARGURA - MARGEM * 2,
      height: 66,
      borderColor: rgb(0x16 / 255, 0xa3 / 255, 0x4a / 255),
      borderWidth: 1,
    });
    pagina.drawText("ASSINADO ELETRONICAMENTE", { x: MARGEM + 10, y: y - 16, size: 10, font: fonteNegrito, color: rgb(0x15 / 255, 0x80 / 255, 0x3d / 255) });
    pagina.drawText(`Nome: ${dados.assinatura.nome}`, { x: MARGEM + 10, y: y - 32, size: 9, font: fonte, color: PRETO });
    pagina.drawText(`CPF: ${dados.assinatura.cpf ?? "não informado"}`, { x: MARGEM + 10, y: y - 46, size: 9, font: fonte, color: PRETO });
    pagina.drawText(`Assinado em: ${formatarData(dados.assinatura.dataHora)} às ${dados.assinatura.dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`, {
      x: MARGEM + 10,
      y: y - 60,
      size: 9,
      font: fonte,
      color: CINZA,
    });
    y -= 90;
  } else {
    // Duas linhas de assinatura desenhadas (não texto com "_____"): a largura de
    // um monte de underscores varia com a fonte e nunca bate certinho com a
    // largura útil da página — desenhando a régua direto, cada metade fica
    // exatamente do mesmo tamanho e os rótulos centralizam certo embaixo.
    garantirEspaco(60);
    const larguraConteudo = LARGURA - MARGEM * 2;
    const espacoEntreColunas = 24;
    const larguraColuna = (larguraConteudo - espacoEntreColunas) / 2;
    const xColuna1 = MARGEM;
    const xColuna2 = MARGEM + larguraColuna + espacoEntreColunas;

    pagina.drawLine({ start: { x: xColuna1, y }, end: { x: xColuna1 + larguraColuna, y }, thickness: 0.75, color: PRETO });
    pagina.drawLine({ start: { x: xColuna2, y }, end: { x: xColuna2 + larguraColuna, y }, thickness: 0.75, color: PRETO });
    y -= 16;

    const larguraContratante = fonteNegrito.widthOfTextAtSize("CONTRATANTE", 9);
    const larguraContratada = fonteNegrito.widthOfTextAtSize("CONTRATADA", 9);
    pagina.drawText("CONTRATANTE", { x: xColuna1 + (larguraColuna - larguraContratante) / 2, y, size: 9, font: fonteNegrito, color: PRETO });
    pagina.drawText("CONTRATADA", { x: xColuna2 + (larguraColuna - larguraContratada) / 2, y, size: 9, font: fonteNegrito, color: PRETO });
    y -= 24;
  }

  // Campo de testemunha — linha em branco pra assinatura, no final do contrato.
  // Mesma régua desenhada (não texto) e mesmo layout da dupla CONTRATANTE/CONTRATADA
  // acima (linha cheia + rótulo centralizado embaixo) — sem CPF, a pedido do dono
  // do sistema (ficava um campo de formulário estranho ali, tirou).
  garantirEspaco(50);
  y -= 10;
  const larguraConteudoTestemunha = LARGURA - MARGEM * 2;
  pagina.drawLine({ start: { x: MARGEM, y }, end: { x: LARGURA - MARGEM, y }, thickness: 0.75, color: PRETO });
  y -= 16;

  const larguraTestemunha = fonteNegrito.widthOfTextAtSize("TESTEMUNHA", 9);
  pagina.drawText("TESTEMUNHA", {
    x: MARGEM + (larguraConteudoTestemunha - larguraTestemunha) / 2,
    y,
    size: 9,
    font: fonteNegrito,
    color: PRETO,
  });
  y -= 20;

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

// NOTA: o contrato real distingue 3 turnos (Integral / Contraturno / Tarde),
// mas o schema hoje só tem Turma.turno = MANHA | TARDE. Enquanto isso não for
// modelado à parte, quem chama gerarContratoPdf() decide o turnoLabel (ex.:
// pelo nome da turma conter "integral"/"contraturno"). Ver app/api/contratos/route.ts.
