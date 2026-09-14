import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { segundaFeiraDe, diasDaSemana, isoData, tipoPadraoDoDia, type ConteudoDiaPlanejamento } from "@/lib/planejamento";
import type { TipoDiaPlanejamento } from "@prisma/client";

/** Confere se quem tá logado pode ESCREVER o planejamento dessa turma — hoje
 * só a REGENTE dela (ou ADMIN). Especialista escrever planejamento da
 * própria matéria ainda não foi confirmado com o dono, fica de fora por
 * enquanto (ver task #18). */
async function podeEscrever(userId: string, role: string, turmaId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const vinculo = await prisma.vinculoPedagogico.findFirst({ where: { userId, turmaId, papel: "REGENTE" } });
  return !!vinculo;
}

const CHAVES_CONTEUDO: (keyof ConteudoDiaPlanejamento)[] = [
  "tematicaDia",
  "momentoInicial",
  "questionamentosInicial",
  "momentoFundamental",
  "questionamentosFundamental",
  "contextoOrganizado",
  "rodaDeConversa",
  "questionamentosRoda",
  "organizacaoContexto",
  "questionamentosContexto",
  "momentoFinal",
  "questionamentosFinal",
  "folhaTemaLiterario",
  "folhaAtividadeGrafica",
];

/** Limpa o JSON de conteúdo de um dia — só aceita as chaves conhecidas, tudo
 * texto, trim, e descarta o que vier vazio (evita acumular lixo no JSON ao
 * longo de várias edições). */
function sanearConteudo(valor: unknown): ConteudoDiaPlanejamento {
  const obj = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const limpo: ConteudoDiaPlanejamento = {};
  for (const chave of CHAVES_CONTEUDO) {
    const texto = obj[chave] ? String(obj[chave]).trim() : "";
    if (texto) limpo[chave] = texto;
  }
  return limpo;
}

/** Busca o planejamento de uma turma numa semana específica (normalizada pra
 * segunda-feira) — devolve os 5 dias sempre, com valor padrão pros que ainda
 * não foram preenchidos, pra o formulário não precisar tratar "não existe
 * ainda" como caso especial. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  const semanaParam = req.nextUrl.searchParams.get("semana");
  if (!turmaId || !semanaParam) {
    return NextResponse.json({ error: "Informe turmaId e semana" }, { status: 400 });
  }
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  const [planejamento, projetoAtivo, horarios] = await Promise.all([
    prisma.planejamento.findUnique({
      where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
      include: { dias: true, projeto: { select: { id: true, nome: true, justificativa: true } } },
    }),
    prisma.projetoPedagogico.findFirst({ where: { turmaId, ativo: true }, select: { id: true, nome: true, justificativa: true } }),
    prisma.horarioEspecializada.findMany({ where: { turmaId } }),
  ]);
  // Justificativa do projeto escolhido nessa semana (o real, salvo, ou o
  // ativo quando a semana ainda não tem um escolhido) — achado real, set/2026:
  // o documento copia nome + justificativa do projeto em cada semana, não só
  // o nome.
  const projetoDaSemana = planejamento?.projeto ?? projetoAtivo;

  const diasPorData = new Map((planejamento?.dias ?? []).map((d) => [isoData(d.data), d]));
  const horarioPorDiaSemana = new Map(horarios.map((h) => [h.diaSemana, h.texto]));
  const dias = diasDaSemana(semanaInicio).map((data, indice) => {
    const salvo = diasPorData.get(isoData(data));
    return {
      data: isoData(data),
      tipo: (salvo?.tipo ?? tipoPadraoDoDia(indice)) as TipoDiaPlanejamento,
      conteudo: (salvo?.conteudo ?? {}) as ConteudoDiaPlanejamento,
      // Pré-preenche com o horário fixo da turma (HorarioEspecializada)
      // quando o dia ainda não foi salvo — mesmo raciocínio do tipoPadraoDoDia.
      especializadas: salvo?.especializadas ?? horarioPorDiaSemana.get(indice) ?? "",
    };
  });

  return NextResponse.json({
    semanaInicio: isoData(semanaInicio),
    projetoId: planejamento?.projetoId ?? projetoAtivo?.id ?? null,
    projetoJustificativa: projetoDaSemana?.justificativa ?? "",
    materiais: planejamento?.materiais ?? "",
    tardeCulturalApresentacao: planejamento?.tardeCulturalApresentacao ?? "",
    tardeCulturalMateriais: planejamento?.tardeCulturalMateriais ?? "",
    status: planejamento?.status ?? "RASCUNHO",
    dias,
    podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId),
  });
}

/** Salva (cria ou substitui) o planejamento de uma turma numa semana — o
 * front sempre manda os 5 dias completos, então é upsert simples seguido de
 * substituir os PlanejamentoDia numa transação. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const turmaId = String(body?.turmaId ?? "");
  const semanaParam = String(body?.semana ?? "");
  const projetoId = body?.projetoId ? String(body.projetoId) : null;
  const materiais = body?.materiais ? String(body.materiais).trim() : null;
  const tardeCulturalApresentacao = body?.tardeCulturalApresentacao ? String(body.tardeCulturalApresentacao).trim() : null;
  const tardeCulturalMateriais = body?.tardeCulturalMateriais ? String(body.tardeCulturalMateriais).trim() : null;
  const dias = Array.isArray(body?.dias) ? body.dias : [];
  // undefined = não mexe no status atual (salvar comum); só muda quando o
  // front manda explícito (botão "Finalizar" manda ENVIADO) — mesmo padrão
  // já usado em /api/pareceres/[id]/alunos/[alunoId].
  const status = body?.status === "ENVIADO" ? "ENVIADO" : body?.status === "RASCUNHO" ? "RASCUNHO" : undefined;

  if (!turmaId || !semanaParam) return NextResponse.json({ error: "Informe turmaId e semana" }, { status: 400 });
  const semana = new Date(`${semanaParam}T00:00:00.000Z`);
  if (Number.isNaN(semana.getTime())) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  const semanaInicio = segundaFeiraDe(semana);

  if (!(await podeEscrever(session.user.id, session.user.role, turmaId))) {
    return NextResponse.json({ error: "Só a professora regente dessa turma edita o planejamento" }, { status: 403 });
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  if (projetoId) {
    const projeto = await prisma.projetoPedagogico.findUnique({ where: { id: projetoId } });
    if (!projeto || projeto.turmaId !== turmaId) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 400 });
  }

  const diasValidos: { data: Date; tipo: TipoDiaPlanejamento; conteudo: ConteudoDiaPlanejamento; especializadas: string | null }[] = [];
  for (const d of dias) {
    const data = new Date(`${d?.data}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime())) continue;
    const tipo: TipoDiaPlanejamento = d?.tipo === "CONTEXTO" ? "CONTEXTO" : "TEMATICA";
    const conteudo = sanearConteudo(d?.conteudo);
    const especializadas = d?.especializadas ? String(d.especializadas).trim() : null;
    diasValidos.push({ data, tipo, conteudo, especializadas });
  }
  // Só grava dia que tem pelo menos algo preenchido (conteúdo ou especializadas)
  // — dia em branco não vira registro, mesma lógica de antes.
  const diasComConteudo = diasValidos.filter((d) => Object.keys(d.conteudo).length > 0 || d.especializadas);

  try {
    const planejamento = await prisma.$transaction(async (tx) => {
      const registro = await tx.planejamento.upsert({
        where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
        create: {
          turmaId,
          semanaInicio,
          projetoId,
          materiais,
          tardeCulturalApresentacao,
          tardeCulturalMateriais,
          autorId: session.user.id,
          ...(status ? { status } : {}),
        },
        update: {
          projetoId,
          materiais,
          tardeCulturalApresentacao,
          tardeCulturalMateriais,
          autorId: session.user.id,
          ...(status ? { status } : {}),
        },
      });
      await tx.planejamentoDia.deleteMany({ where: { planejamentoId: registro.id } });
      await tx.planejamentoDia.createMany({
        data: diasComConteudo.map((d) => ({
          planejamentoId: registro.id,
          data: d.data,
          tipo: d.tipo,
          conteudo: d.conteudo,
          especializadas: d.especializadas,
        })),
      });
      return registro;
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Planejamento da semana de ${isoData(semanaInicio)} ${status === "ENVIADO" ? "finalizado" : "salvo"} (${turma.nome})`,
        entidade: "Planejamento",
        entidadeId: planejamento.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
