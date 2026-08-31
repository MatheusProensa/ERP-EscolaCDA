import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarFichaMatriculaPdf } from "@/lib/gerarFichaMatriculaPdf";
import { respostaPDF, nomeArquivoPdf } from "@/lib/gerarRelatorioPdf";
import { turnoDoContrato } from "@/lib/contratoTexto";
import { RACA_COR_LABEL } from "@/lib/censo";

type ResponsavelInput = {
  nome: string;
  rg?: string;
  cpf?: string;
  email?: string;
  escolaridade?: string;
  profissao?: string;
  endereco?: string;
  cep?: string;
  telefoneFixo?: string;
  telefoneComercial?: string;
  telefoneCelular?: string;
} | null;

// Salva os dados novos da Ficha de Matrícula (perfil da criança + filiação
// detalhada + pessoas autorizadas) e devolve o PDF já gerado — é o mesmo
// fluxo "editar e gerar de uma vez" usado no Contrato (GerarContratoModal).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    matriculaId,
    alunoCpf,
    turnoLabel,
    sexo,
    racaCor,
    autorizacaoImagem,
    temIrmaos,
    idadesIrmaos,
    usaBico,
    usaMamadeira,
    obsBicoMamadeira,
    jaFrequentouEscola,
    duracaoEscolaAnterior,
    rotinaSonoAlimentacao,
    brincadeirasPrediletas,
    reacoesContrariado,
    pai,
    mae,
    pessoasAutorizadas,
  }: {
    matriculaId?: string;
    alunoCpf?: string;
    turnoLabel?: string;
    sexo?: "M" | "F" | null;
    racaCor?: string | null;
    autorizacaoImagem?: boolean;
    temIrmaos?: boolean | null;
    idadesIrmaos?: string;
    usaBico?: boolean | null;
    usaMamadeira?: boolean | null;
    obsBicoMamadeira?: string;
    jaFrequentouEscola?: boolean | null;
    duracaoEscolaAnterior?: string;
    rotinaSonoAlimentacao?: string;
    brincadeirasPrediletas?: string;
    reacoesContrariado?: string;
    pai?: ResponsavelInput;
    mae?: ResponsavelInput;
    pessoasAutorizadas?: { nome: string; parentesco: string }[];
  } = body;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      responsaveis: true,
      matriculas: { include: { turma: true, anoLetivo: true }, orderBy: { dataMatricula: "desc" } },
    },
  });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const matricula = matriculaId
    ? aluno.matriculas.find((m) => m.id === matriculaId)
    : (aluno.matriculas.find((m) => m.situacao === "ATIVA") ?? aluno.matriculas[0]);

  await prisma.aluno.update({
    where: { id },
    data: {
      cpf: alunoCpf ? alunoCpf.replace(/\D/g, "") : undefined,
      sexo: sexo ?? undefined,
      racaCor: (racaCor as never) ?? undefined,
      autorizacaoImagem: autorizacaoImagem ?? undefined,
      temIrmaos: temIrmaos ?? undefined,
      idadesIrmaos: idadesIrmaos || null,
      usaBico: usaBico ?? undefined,
      usaMamadeira: usaMamadeira ?? undefined,
      obsBicoMamadeira: obsBicoMamadeira || null,
      jaFrequentouEscola: jaFrequentouEscola ?? undefined,
      duracaoEscolaAnterior: duracaoEscolaAnterior || null,
      rotinaSonoAlimentacao: rotinaSonoAlimentacao || null,
      brincadeirasPrediletas: brincadeirasPrediletas || null,
      reacoesContrariado: reacoesContrariado || null,
    },
  });

  async function upsertResponsavel(dados: ResponsavelInput, parentescoPadrao: "Pai" | "Mãe") {
    if (!dados || !dados.nome?.trim()) return null;
    const existente = aluno!.responsaveis.find(
      (r) => r.parentesco.trim().toLowerCase() === parentescoPadrao.toLowerCase()
    );
    const data = {
      nome: dados.nome.trim(),
      rg: dados.rg || null,
      cpf: dados.cpf || null,
      email: dados.email || null,
      escolaridade: dados.escolaridade || null,
      profissao: dados.profissao || null,
      endereco: dados.endereco || null,
      cep: dados.cep || null,
      telefoneFixo: dados.telefoneFixo || null,
      telefoneComercial: dados.telefoneComercial || null,
      telefone: dados.telefoneCelular || existente?.telefone || "",
    };
    if (existente) {
      return prisma.responsavel.update({ where: { id: existente.id }, data });
    }
    return prisma.responsavel.create({ data: { ...data, parentesco: parentescoPadrao, alunoId: id } });
  }

  const [paiSalvo, maeSalvo] = await Promise.all([
    upsertResponsavel(pai ?? null, "Pai"),
    upsertResponsavel(mae ?? null, "Mãe"),
  ]);

  // O endereço mora no Responsável (é dele o dado), mas o cadastro do aluno tem
  // campo de endereço próprio (usado em relatórios/ficha) — sem isso, ficava
  // preenchido aqui na Ficha de Matrícula e "Não informado" no cadastro, mesma
  // informação em dois lugares divergindo. Só copia se o aluno ainda não tiver
  // o dele (não sobrescreve algo que já foi digitado direto no cadastro).
  if (!aluno.endereco) {
    const comEndereco = (paiSalvo?.endereco ? paiSalvo : maeSalvo?.endereco ? maeSalvo : null);
    if (comEndereco?.endereco) {
      await prisma.aluno.update({
        where: { id },
        data: { endereco: comEndereco.endereco, cidade: aluno.cidade ?? "Santa Maria", cep: comEndereco.cep ?? undefined },
      });
    }
  }

  if (Array.isArray(pessoasAutorizadas)) {
    await prisma.pessoaAutorizada.deleteMany({ where: { alunoId: id } });
    const validas = pessoasAutorizadas.filter((p) => p.nome?.trim());
    if (validas.length > 0) {
      await prisma.pessoaAutorizada.createMany({
        data: validas.map((p) => ({ nome: p.nome.trim(), parentesco: p.parentesco?.trim() || "Não informado", alunoId: id })),
      });
    }
  }

  await prisma.logAtividade.create({
    data: {
      acao: `Ficha de matrícula atualizada - ${aluno.nome}`,
      entidade: "Aluno",
      entidadeId: aluno.id,
      usuario: session.user.name ?? "Usuário",
    },
  });

  const alunoAtualizado = await prisma.aluno.findUniqueOrThrow({
    where: { id },
    include: { pessoasAutorizadas: true },
  });

  const obsSaude = [
    alunoAtualizado.alergias && `Alergias: ${alunoAtualizado.alergias}`,
    alunoAtualizado.restricoes && `Restrições alimentares: ${alunoAtualizado.restricoes}`,
    alunoAtualizado.medicacaoContinua && `Medicação contínua: ${alunoAtualizado.medicacaoContinua}`,
    alunoAtualizado.necessidadesEsp && `Necessidades especiais: ${alunoAtualizado.necessidadesEsp}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const pdf = await gerarFichaMatriculaPdf({
    anoLetivo: matricula?.anoLetivo.ano ?? new Date().getFullYear(),
    dataIngresso: matricula?.dataMatricula ?? new Date(),
    turnoLabel:
      turnoLabel || (matricula ? turnoDoContrato(matricula.turma.nome, matricula.turma.turno) : "Não informado"),
    alunoNome: alunoAtualizado.nome,
    alunoDataNascimento: alunoAtualizado.dataNascimento,
    alunoCpf: alunoAtualizado.cpf,
    sexo: alunoAtualizado.sexo,
    racaCorLabel: alunoAtualizado.racaCor ? RACA_COR_LABEL[alunoAtualizado.racaCor] : null,
    autorizaImagemMarcado: alunoAtualizado.autorizacaoImagem,
    temIrmaos: alunoAtualizado.temIrmaos,
    idadesIrmaos: alunoAtualizado.idadesIrmaos,
    usaBico: alunoAtualizado.usaBico,
    usaMamadeira: alunoAtualizado.usaMamadeira,
    obsBicoMamadeira: alunoAtualizado.obsBicoMamadeira,
    jaFrequentouEscola: alunoAtualizado.jaFrequentouEscola,
    duracaoEscolaAnterior: alunoAtualizado.duracaoEscolaAnterior,
    temProblemaSaude: obsSaude.length > 0,
    obsSaude,
    rotinaSonoAlimentacao: alunoAtualizado.rotinaSonoAlimentacao,
    brincadeirasPrediletas: alunoAtualizado.brincadeirasPrediletas,
    reacoesContrariado: alunoAtualizado.reacoesContrariado,
    pai: paiSalvo
      ? {
          nome: paiSalvo.nome,
          rg: paiSalvo.rg,
          cpf: paiSalvo.cpf,
          email: paiSalvo.email,
          escolaridade: paiSalvo.escolaridade,
          profissao: paiSalvo.profissao,
          endereco: paiSalvo.endereco,
          cep: paiSalvo.cep,
          telefoneFixo: paiSalvo.telefoneFixo,
          telefoneComercial: paiSalvo.telefoneComercial,
          telefoneCelular: paiSalvo.telefone,
        }
      : null,
    mae: maeSalvo
      ? {
          nome: maeSalvo.nome,
          rg: maeSalvo.rg,
          cpf: maeSalvo.cpf,
          email: maeSalvo.email,
          escolaridade: maeSalvo.escolaridade,
          profissao: maeSalvo.profissao,
          endereco: maeSalvo.endereco,
          cep: maeSalvo.cep,
          telefoneFixo: maeSalvo.telefoneFixo,
          telefoneComercial: maeSalvo.telefoneComercial,
          telefoneCelular: maeSalvo.telefone,
        }
      : null,
    pessoasAutorizadas: alunoAtualizado.pessoasAutorizadas.map((p) => ({ nome: p.nome, parentesco: p.parentesco })),
  });

  return respostaPDF(pdf, nomeArquivoPdf("Ficha de Matricula", alunoAtualizado.nome));
}
