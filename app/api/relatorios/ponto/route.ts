import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paraCSV, respostaCSV } from "@/lib/csv";
import { gerarRelatorioPdfMultiSecao, respostaPDF, type SecaoRelatorio } from "@/lib/gerarRelatorioPdf";
import { calcularMes, minParaHora, OCORRENCIA_LABEL, type RegistroPontoDia } from "@/lib/ponto";

function inicioMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes - 1, 1));
}
function fimMes(mes: number, ano: number) {
  return new Date(Date.UTC(ano, mes, 1));
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmtHora(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtData(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ultimoDiaDoMes(mes: number, ano: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const hoje = new Date();
  const mes = Number(params.get("mes")) || hoje.getUTCMonth() + 1;
  const ano = Number(params.get("ano")) || hoje.getUTCFullYear();
  const funcionarioId = params.get("funcionarioId");
  const nomeMes = MESES[mes - 1];

  const inicio = inicioMes(mes, ano);
  const fim = fimMes(mes, ano);

  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true, ...(funcionarioId ? { id: funcionarioId } : { participaPonto: true }) },
    orderBy: { nome: "asc" },
  });

  const registros = await prisma.registroPonto.findMany({
    where: { funcionarioId: { in: funcionarios.map((f) => f.id) }, data: { lt: fim } },
    orderBy: { data: "asc" },
  });
  const registrosPorFuncionario = new Map<string, typeof registros>();
  for (const r of registros) {
    const lista = registrosPorFuncionario.get(r.funcionarioId) ?? [];
    lista.push(r);
    registrosPorFuncionario.set(r.funcionarioId, lista);
  }

  const secoes: SecaoRelatorio[] = [];
  const linhasCSV: Record<string, string>[] = [];

  for (const f of funcionarios) {
    const todos = registrosPorFuncionario.get(f.id) ?? [];
    const registrosAnteriores = todos.filter((r) => r.data < inicio);
    const registrosMes = todos.filter((r) => r.data >= inicio && r.data < fim);

    const jornada = f.jornadaPrevistaMinutos ?? 0;
    const diasAnteriores = calcularMes(registrosAnteriores as RegistroPontoDia[], jornada);
    const saldoInicial = diasAnteriores.length > 0 ? diasAnteriores[diasAnteriores.length - 1].saldoAcumulado : 0;
    const dias = calcularMes(registrosMes as RegistroPontoDia[], jornada, saldoInicial);

    const linhas = dias.map((d) => ({
      Data: fmtData(d.data),
      "Entrada 1": fmtHora(d.pares[0].entrada),
      "Saída 1": fmtHora(d.pares[0].saida),
      "Entrada 2": fmtHora(d.pares[1].entrada),
      "Saída 2": fmtHora(d.pares[1].saida),
      Ocorrência: OCORRENCIA_LABEL[d.ocorrencia] ?? d.ocorrencia,
      Previstas: minParaHora(d.horasPrevistas),
      Trabalhadas: minParaHora(d.horasTrabalhadas),
      "Atraso/Falta": d.atrasoFalta > 0 ? minParaHora(d.atrasoFalta) : "—",
      "Hora Extra": d.horaExtra > 0 ? minParaHora(d.horaExtra) : "—",
      "Ad. Noturno": d.adicionalNoturno > 0 ? minParaHora(d.adicionalNoturno) : "—",
      "Banco de Horas": minParaHora(d.saldoAcumulado),
    }));

    // No PDF (só nele — o CSV continua só com dia lançado, é dado pra planilha)
    // o mês inteiro aparece, um dia por linha, mesmo os dias sem nada lançado —
    // pedido de quem gera a folha pra imprimir/conferir: precisa ver o mês
    // completo, não só os dias com registro.
    const porData = new Map(linhas.map((l) => [l.Data, l]));
    const linhasCompletas = [];
    for (let dia = 1; dia <= ultimoDiaDoMes(mes, ano); dia++) {
      const chave = fmtData(new Date(Date.UTC(ano, mes - 1, dia)));
      linhasCompletas.push(
        porData.get(chave) ?? {
          Data: chave,
          "Entrada 1": "—",
          "Saída 1": "—",
          "Entrada 2": "—",
          "Saída 2": "—",
          Ocorrência: "—",
          Previstas: "—",
          Trabalhadas: "—",
          "Atraso/Falta": "—",
          "Hora Extra": "—",
          "Ad. Noturno": "—",
          "Banco de Horas": "—",
        }
      );
    }

    secoes.push({
      titulo: f.nome,
      subtitulo: `${f.cargo} · ${nomeMes}/${ano} · Saldo Banco de Horas: ${minParaHora(dias[dias.length - 1]?.saldoAcumulado ?? saldoInicial)}`,
      colunas: [
        { chave: "Data", label: "Data", largura: 40 },
        { chave: "Entrada 1", label: "Entrada", largura: 46 },
        { chave: "Saída 1", label: "Saída", largura: 46 },
        { chave: "Entrada 2", label: "Entrada", largura: 46 },
        { chave: "Saída 2", label: "Saída", largura: 46 },
        { chave: "Ocorrência", label: "Ocorrência", largura: 55 },
        { chave: "Previstas", label: "Previstas", largura: 66 },
        { chave: "Trabalhadas", label: "Trabalhadas", largura: 76 },
        { chave: "Atraso/Falta", label: "Atraso/Falta", largura: 82 },
        { chave: "Hora Extra", label: "Hora Extra", largura: 68 },
        { chave: "Ad. Noturno", label: "Ad. Noturno", largura: 74 },
        { chave: "Banco de Horas", label: "Banco de Horas", largura: 92 },
      ],
      linhas: linhasCompletas,
    });

    for (const linha of linhas) {
      linhasCSV.push({ Funcionário: f.nome, ...linha });
    }
  }

  const dataGerado = new Date().toISOString().slice(0, 10);

  if (params.get("formato") === "pdf") {
    const pdf = await gerarRelatorioPdfMultiSecao({ titulo: `Ponto — ${nomeMes}/${ano}`, secoes });
    return respostaPDF(pdf, `ponto_${nomeMes.toLowerCase()}_${ano}_${dataGerado}.pdf`);
  }

  const csv = paraCSV(linhasCSV, [
    "Funcionário", "Data", "Entrada 1", "Saída 1", "Entrada 2", "Saída 2", "Ocorrência",
    "Horas Previstas", "Horas Trabalhadas", "Atraso/Falta", "Hora Extra", "Adicional Noturno", "Saldo Banco de Horas",
  ]);
  return respostaCSV(csv, `ponto_${nomeMes.toLowerCase()}_${ano}_${dataGerado}.csv`);
}
