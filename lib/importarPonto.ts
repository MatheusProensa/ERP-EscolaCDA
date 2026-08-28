import ExcelJS from "exceljs";

/**
 * Importação da planilha de Ponto que a escola já usa (formato do Google
 * Sheets do pai do Matheus): uma aba por mês ("Janeiro".."Dezembro"), com
 * colunas Data | Entrada | Saída | Entrada | Saída | Entrada | Saída a
 * partir da linha 2. É sempre a planilha de UMA pessoa só — quem escolhe de
 * quem é o funcionário já selecionado na tela (não tenta adivinhar pelo
 * conteúdo do arquivo).
 */

export const MESES_PLANILHA = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export type RegistroImportado = {
  /** yyyy-mm-dd */
  data: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  entrada3: string;
  saida3: string;
};

export type ResultadoParsePonto = {
  registros: RegistroImportado[];
  /** Nome encontrado na aba "Total" — só um palpite pra confirmação visual,
   * não decide de quem é o arquivo (isso já vem de qual tela o upload foi feito). */
  nomeDetectado: string | null;
  erro?: string;
};

function resolverValorFormula(valor: ExcelJS.CellValue): ExcelJS.CellValue {
  if (valor !== null && typeof valor === "object" && "formula" in valor) {
    return (valor as { result?: ExcelJS.CellValue }).result ?? null;
  }
  return valor;
}

function celulaParaData(valorBruto: ExcelJS.CellValue): Date | null {
  const valor = resolverValorFormula(valorBruto);
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  return null;
}

/** Célula de hora do Excel vira Date com época 1899-12-30 (ou, às vezes,
 * um número — fração do dia). Normaliza pra "HH:MM". */
function celulaParaHora(valorBruto: ExcelJS.CellValue): string {
  const valor = resolverValorFormula(valorBruto);
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const hh = String(valor.getUTCHours()).padStart(2, "0");
    const mm = String(valor.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (typeof valor === "number" && valor >= 0 && valor < 1) {
    const totalMin = Math.round(valor * 24 * 60);
    const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
    const mm = String(totalMin % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return "";
}

const RESERVADO_NOME = new Set(["TOTAL DO SEMESTRE", "BANCO DE HORAS", "Horas"]);

/** Tira "Prof.", "Profª", "Sra.", "Sr." etc. do começo — é só pra exibição. */
function limparPrefixoNome(nome: string): string {
  return nome.replace(/^(prof\.?a?º?|sr\.?a?|sra\.?)\s+/i, "").trim();
}

function detectarNome(ws: ExcelJS.Worksheet | undefined): string | null {
  if (!ws) return null;
  let encontrado: string | null = null;
  ws.eachRow((row) => {
    if (encontrado) return;
    row.eachCell((cell) => {
      if (encontrado) return;
      const v = cell.value;
      if (typeof v === "string" && v.trim() && !RESERVADO_NOME.has(v.trim())) {
        encontrado = limparPrefixoNome(v.trim());
      }
    });
  });
  return encontrado;
}

export async function parsarPlanilhaPonto(buffer: Buffer): Promise<ResultadoParsePonto> {
  const workbook = new ExcelJS.Workbook();
  let wb: ExcelJS.Workbook;
  try {
    wb = await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { registros: [], nomeDetectado: null, erro: "Não consegui abrir esse arquivo como planilha .xlsx." };
  }

  const registros: RegistroImportado[] = [];
  const vistos = new Set<string>();

  for (const nomeMes of MESES_PLANILHA) {
    const ws = wb.getWorksheet(nomeMes);
    if (!ws) continue;

    // Linhas 2..100: cobre meses de até 31 dias com folga pra planilhas com
    // alguma linha extra — para assim que 8 linhas seguidas vierem sem data
    // (fim dos lançamentos daquele mês).
    let semDataSeguidas = 0;
    for (let r = 2; r <= 100 && semDataSeguidas < 8; r++) {
      const row = ws.getRow(r);
      const data = celulaParaData(row.getCell(1).value);
      if (!data) {
        semDataSeguidas++;
        continue;
      }
      semDataSeguidas = 0;

      const chave = data.toISOString().slice(0, 10);
      const entrada1 = celulaParaHora(row.getCell(2).value);
      const saida1 = celulaParaHora(row.getCell(3).value);
      const entrada2 = celulaParaHora(row.getCell(4).value);
      const saida2 = celulaParaHora(row.getCell(5).value);
      const entrada3 = celulaParaHora(row.getCell(6).value);
      const saida3 = celulaParaHora(row.getCell(7).value);

      if (!entrada1 && !saida1 && !entrada2 && !saida2 && !entrada3 && !saida3) continue;
      if (vistos.has(chave)) continue; // planilha não deveria repetir data, mas por garantia
      vistos.add(chave);

      registros.push({ data: chave, entrada1, saida1, entrada2, saida2, entrada3, saida3 });
    }
  }

  registros.sort((a, b) => a.data.localeCompare(b.data));
  const nomeDetectado = detectarNome(wb.getWorksheet("Total"));

  if (registros.length === 0) {
    return {
      registros: [],
      nomeDetectado,
      erro: "Não encontrei nenhum dia lançado nas abas de mês (Janeiro, Fevereiro...). Confira se é a planilha certa.",
    };
  }

  return { registros, nomeDetectado };
}
