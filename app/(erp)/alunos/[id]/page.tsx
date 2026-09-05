import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlunoCard } from "@/components/modules/alunos/AlunoCard";
import { CensoSecao } from "@/components/modules/alunos/CensoSecao";
import { ContratoSecao } from "@/components/modules/alunos/ContratoSecao";
import { MatriculaAcoes } from "@/components/modules/alunos/MatriculaAcoes";
import { ResponsaveisSecao } from "@/components/modules/alunos/ResponsaveisSecao";
import { PessoasAutorizadasSecao } from "@/components/modules/alunos/PessoasAutorizadasSecao";
import { NovaMatriculaModal } from "@/components/modules/alunos/NovaMatriculaModal";
import { FichaMatriculaAcoes } from "@/components/modules/alunos/FichaMatriculaAcoes";
import { podeEditarModulo } from "@/lib/permissoes";
import { ordenarTurmas, formatarData } from "@/lib/utils";
import { turnoDoContrato } from "@/lib/contratoTexto";
import { turmasComMatriculados } from "@/lib/turmas";

export default async function AlunoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const podeEditar = podeEditarModulo("/alunos", session?.user.role ?? "", session?.user.permissoes);

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      responsaveis: true,
      pessoasAutorizadas: true,
      matriculas: {
        include: { turma: true, contrato: true, anoLetivo: true },
        orderBy: { dataMatricula: "desc" },
      },
    },
  });

  if (!aluno) notFound();

  const matriculasAtivas = aluno.matriculas.filter((m) => m.situacao === "ATIVA");
  const matriculaPrincipal = matriculasAtivas[0] ?? aluno.matriculas[0];

  const anoLetivo = await getAnoLetivoAtivo();
  const turmasBrutas = anoLetivo
    ? ordenarTurmas(await prisma.turma.findMany({ where: { anoLetivoId: anoLetivo.id } }))
    : [];
  const turmasDisponiveis = await turmasComMatriculados(turmasBrutas);
  const turmaIdsDoAluno = new Set(matriculasAtivas.map((m) => m.turmaId));

  function paraResponsavelFicha(parentesco: "Pai" | "Mãe") {
    const r = aluno!.responsaveis.find((x) => x.parentesco.trim().toLowerCase() === parentesco.toLowerCase());
    if (!r) return null;
    return {
      nome: r.nome,
      rg: r.rg ?? "",
      cpf: r.cpf ?? "",
      email: r.email ?? "",
      escolaridade: r.escolaridade ?? "",
      profissao: r.profissao ?? "",
      endereco: r.endereco ?? "",
      cep: r.cep ?? "",
      telefoneFixo: r.telefoneFixo ?? "",
      telefoneComercial: r.telefoneComercial ?? "",
      telefoneCelular: r.telefone ?? "",
    };
  }

  return (
    <div>
      <PageHeader
        title={aluno.nome}
        breadcrumb={[{ label: "Alunos", href: "/alunos" }, { label: aluno.nome }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {podeEditar && (
              <NovaMatriculaModal
                alunoId={aluno.id}
                turmas={turmasDisponiveis.filter((t) => !turmaIdsDoAluno.has(t.id))}
              />
            )}
            {matriculaPrincipal && (
              <FichaMatriculaAcoes
                podeEditar={podeEditar}
                alunoId={aluno.id}
                matriculaId={matriculaPrincipal.id}
                alunoNome={aluno.nome}
                alunoDataNascimentoLabel={formatarData(aluno.dataNascimento)}
                dataIngressoLabel={formatarData(matriculaPrincipal.dataMatricula)}
                turnoLabel={turnoDoContrato(matriculaPrincipal.turma.nome, matriculaPrincipal.turma.turno)}
                alunoCpfInicial={aluno.cpf ?? ""}
                sexoInicial={aluno.sexo ?? ""}
                racaCorInicial={aluno.racaCor ?? ""}
                autorizacaoImagemInicial={aluno.autorizacaoImagem}
                temIrmaosInicial={aluno.temIrmaos ?? false}
                idadesIrmaosInicial={aluno.idadesIrmaos ?? ""}
                usaBicoInicial={aluno.usaBico ?? false}
                usaMamadeiraInicial={aluno.usaMamadeira ?? false}
                obsBicoMamadeiraInicial={aluno.obsBicoMamadeira ?? ""}
                jaFrequentouEscolaInicial={aluno.jaFrequentouEscola ?? false}
                duracaoEscolaAnteriorInicial={aluno.duracaoEscolaAnterior ?? ""}
                rotinaSonoAlimentacaoInicial={aluno.rotinaSonoAlimentacao ?? ""}
                brincadeirasPrediletasInicial={aluno.brincadeirasPrediletas ?? ""}
                reacoesContrariadoInicial={aluno.reacoesContrariado ?? ""}
                paiInicial={paraResponsavelFicha("Pai")}
                maeInicial={paraResponsavelFicha("Mãe")}
                pessoasAutorizadasInicial={aluno.pessoasAutorizadas.map((p) => ({ nome: p.nome, parentesco: p.parentesco }))}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <AlunoCard aluno={aluno} turmas={matriculasAtivas.map((m) => m.turma.nome)} podeEditar={podeEditar} />

          <CensoSecao aluno={aluno} podeEditar={podeEditar} />

          {aluno.matriculas.map((m) => (
            <ContratoSecao
              key={m.id}
              matriculaId={m.id}
              turmaNome={m.turma.nome}
              turno={m.turma.turno}
              contrato={m.contrato}
              anoLetivo={m.anoLetivo.ano}
              alunoNome={aluno.nome}
              alunoDataNascimento={aluno.dataNascimento.toISOString().slice(0, 10)}
              responsavelNome={aluno.responsaveis[0]?.nome ?? ""}
              responsavelCpf={aluno.responsaveis[0]?.cpf ?? ""}
              valorMensalidade={m.valorMensalidade ?? 0}
              podeEditar={podeEditar}
              action={
                <MatriculaAcoes
                  matriculaId={m.id}
                  turmaNome={m.turma.nome}
                  turmasDisponiveis={turmasDisponiveis.filter((t) => t.id !== m.turmaId)}
                  podeEditar={podeEditar}
                />
              }
            />
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <ResponsaveisSecao alunoId={aluno.id} responsaveis={aluno.responsaveis} podeEditar={podeEditar} />
          <PessoasAutorizadasSecao alunoId={aluno.id} pessoas={aluno.pessoasAutorizadas} podeEditar={podeEditar} />
        </div>
      </div>
    </div>
  );
}
