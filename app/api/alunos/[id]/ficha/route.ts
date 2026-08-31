import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarFichaPdf, respostaPDF, nomeArquivoPdf, type SecaoFicha } from "@/lib/gerarRelatorioPdf";
import { formatarCPF, formatarData, formatarTelefone } from "@/lib/utils";

const SITUACAO_LABEL: Record<string, string> = {
  ATIVA: "Ativa",
  TRANCADA: "Trancada",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
  CONCLUIDA: "Concluída",
};

const RACA_COR_LABEL: Record<string, string> = {
  BRANCA: "Branca",
  PRETA: "Preta",
  PARDA: "Parda",
  AMARELA: "Amarela",
  INDIGENA: "Indígena",
  NAO_DECLARADA: "Não declarada",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      responsaveis: true,
      matriculas: {
        include: { turma: true },
        orderBy: { dataMatricula: "desc" },
      },
    },
  });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const secoes: SecaoFicha[] = [
    {
      titulo: "Dados do aluno",
      campos: [
        { label: "Nome", valor: aluno.nome },
        { label: "Nome social", valor: aluno.nomeSocial ?? "—" },
        { label: "Data de nascimento", valor: formatarData(aluno.dataNascimento) },
        { label: "Naturalidade", valor: aluno.naturalidade ?? "—" },
        { label: "CPF", valor: aluno.cpf ? formatarCPF(aluno.cpf) : "—" },
        { label: "RG", valor: aluno.rg ?? "—" },
        { label: "Certidão de nascimento", valor: aluno.certidaoNascimento ?? "—" },
        { label: "Sexo", valor: aluno.sexo ?? "—" },
        { label: "Raça/Cor", valor: aluno.racaCor ? (RACA_COR_LABEL[aluno.racaCor] ?? aluno.racaCor) : "—" },
        { label: "Filiação 1 (Mãe)", valor: aluno.filiacao1 ?? "—" },
        { label: "Filiação 2 (Pai)", valor: aluno.filiacao2 ?? "—" },
      ],
    },
    {
      titulo: "Endereço",
      campos: [
        { label: "Endereço", valor: aluno.endereco ?? "—" },
        { label: "Bairro", valor: aluno.bairro ?? "—" },
        { label: "Cidade", valor: aluno.cidade ?? "—" },
        { label: "CEP", valor: aluno.cep ?? "—" },
      ],
    },
    {
      titulo: "Saúde",
      campos: [
        { label: "Tipo sanguíneo", valor: aluno.tipoSanguineo ?? "—" },
        { label: "Convênio médico", valor: aluno.convenioMedico ?? "—" },
        { label: "Alergias", valor: aluno.alergias ?? "Nenhuma" },
        { label: "Restrições alimentares", valor: aluno.restricoes ?? "Nenhuma" },
        { label: "Medicação contínua", valor: aluno.medicacaoContinua ?? "Nenhuma" },
        { label: "Necessidades especiais", valor: aluno.necessidadesEsp ?? "Nenhuma" },
        { label: "Deficiência", valor: aluno.deficiencia ? (aluno.tipoDeficiencia ?? "Sim") : "Não" },
        {
          label: "Autorização de imagem",
          valor: aluno.autorizacaoImagem ? "Autorizado" : "Não autorizado",
        },
      ],
    },
    {
      titulo: "Responsáveis",
      campos:
        aluno.responsaveis.length > 0
          ? aluno.responsaveis.map((r) => ({
              label: r.parentesco,
              valor: `${r.nome} · ${formatarTelefone(r.telefone)}${r.email ? ` · ${r.email}` : ""}${r.autorizado ? " · Autorizado a retirar" : ""}`,
            }))
          : [{ label: "Responsáveis", valor: "Nenhum responsável cadastrado" }],
    },
    {
      titulo: "Matrículas",
      campos:
        aluno.matriculas.length > 0
          ? aluno.matriculas.map((m) => ({
              label: m.turma.nome,
              valor: `${SITUACAO_LABEL[m.situacao] ?? m.situacao} · matriculado em ${formatarData(m.dataMatricula)}`,
            }))
          : [{ label: "Matrículas", valor: "Nenhuma matrícula" }],
    },
  ];

  const pdf = await gerarFichaPdf({
    titulo: "Ficha do Aluno",
    subtitulo: aluno.nome,
    secoes,
  });

  return respostaPDF(pdf, nomeArquivoPdf("Ficha do Aluno", aluno.nome));
}
