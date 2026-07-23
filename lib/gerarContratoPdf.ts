import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatarData, formatarMoeda } from "@/lib/utils";

export type DadosContrato = {
  alunoNome: string;
  alunoDataNascimento: Date;
  responsavelNome: string;
  responsavelCpf: string | null;
  turmaNome: string;
  anoLetivo: number;
  valorMensalidade: number;
  dataMatricula: Date;
};

const AZUL_NAVY = rgb(0x0d / 255, 0x1f / 255, 0x4e / 255);
const CINZA = rgb(0x5a / 255, 0x6a / 255, 0x85 / 255);

export async function gerarContratoPdf(dados: DadosContrato): Promise<string> {
  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([595, 842]); // A4
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margem = 56;
  let y = 780;

  function linha(texto: string, opts?: { negrito?: boolean; tamanho?: number; cor?: ReturnType<typeof rgb>; espacoDepois?: number }) {
    const tamanho = opts?.tamanho ?? 10.5;
    pagina.drawText(texto, {
      x: margem,
      y,
      size: tamanho,
      font: opts?.negrito ? fonteNegrito : fonte,
      color: opts?.cor ?? rgb(0, 0, 0),
    });
    y -= tamanho + (opts?.espacoDepois ?? 8);
  }

  function paragrafo(texto: string, tamanho = 10) {
    const larguraMax = 595 - margem * 2;
    const palavras = texto.split(" ");
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      const largura = fonte.widthOfTextAtSize(teste, tamanho);
      if (largura > larguraMax) {
        pagina.drawText(atual, { x: margem, y, size: tamanho, font: fonte });
        y -= tamanho + 4;
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) {
      pagina.drawText(atual, { x: margem, y, size: tamanho, font: fonte });
      y -= tamanho + 4;
    }
    y -= 8;
  }

  linha("ESCOLA CDA", { negrito: true, tamanho: 16, cor: AZUL_NAVY, espacoDepois: 2 });
  linha("Onde, há 15 anos, família e escola sonham juntas", { tamanho: 9, cor: CINZA, espacoDepois: 20 });

  linha("CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS", { negrito: true, tamanho: 12, espacoDepois: 20 });

  linha(`Ano letivo: ${dados.anoLetivo}`, { espacoDepois: 4 });
  linha(`Aluno(a): ${dados.alunoNome}`, { espacoDepois: 4 });
  linha(`Data de nascimento: ${formatarData(dados.alunoDataNascimento)}`, { espacoDepois: 4 });
  linha(`Turma: ${dados.turmaNome}`, { espacoDepois: 4 });
  linha(`Responsável: ${dados.responsavelNome}`, { espacoDepois: 4 });
  linha(`CPF do responsável: ${dados.responsavelCpf ?? "não informado"}`, { espacoDepois: 4 });
  linha(`Data da matrícula: ${formatarData(dados.dataMatricula)}`, { espacoDepois: 4 });
  linha(`Valor da mensalidade: ${formatarMoeda(dados.valorMensalidade)}`, { espacoDepois: 20 });

  linha("CLÁUSULAS", { negrito: true, tamanho: 11, espacoDepois: 10 });

  paragrafo(
    "1. DO OBJETO — O presente contrato tem por objeto a prestação de serviços educacionais pela ESCOLA CDA ao(à) aluno(a) acima identificado(a), referente ao ano letivo indicado."
  );
  paragrafo(
    "2. DA MENSALIDADE — O responsável financeiro compromete-se a efetuar o pagamento da mensalidade escolar, no valor informado, até o dia 10 de cada mês, sujeito a reajuste anual conforme comunicado prévio da escola."
  );
  paragrafo(
    "3. DA FREQUÊNCIA — O(A) aluno(a) deverá cumprir a carga horária e o calendário letivo estabelecidos pela escola, respeitando o regimento interno da instituição."
  );
  paragrafo(
    "4. DA RESCISÃO — O presente contrato poderá ser rescindido a qualquer momento, mediante comunicação formal à secretaria, respeitando eventuais mensalidades já vencidas."
  );
  paragrafo(
    "5. DO FORO — Fica eleito o foro da comarca de Santa Maria/RS para dirimir quaisquer dúvidas oriundas deste contrato."
  );

  y -= 30;
  linha(`Santa Maria/RS, ${formatarData(new Date())}`, { espacoDepois: 40 });

  linha("_____________________________________", { espacoDepois: 4 });
  linha("Assinatura do(a) responsável", { tamanho: 9, cor: CINZA, espacoDepois: 24 });

  linha("_____________________________________", { espacoDepois: 4 });
  linha("Escola CDA", { tamanho: 9, cor: CINZA });

  const bytes = await pdf.save();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}
