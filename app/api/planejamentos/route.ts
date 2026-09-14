import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import {
  segundaFeiraDe,
  diasDaSemana,
  isoData,
  tipoPadraoDoDia,
  type ConteudoDiaPlanejamento,
  type SnapshotPlanejamento,
} from "@/lib/planejamento";
import { criarNotificacao } from "@/lib/notificacoes";
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
      include: {
        dias: true,
        projeto: { select: { id: true, nome: true, justificativa: true } },
        comentarioAutor: { select: { name: true } },
      },
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
    id: planejamento?.id ?? null,
    semanaInicio: isoData(semanaInicio),
    projetoId: planejamento?.projetoId ?? projetoAtivo?.id ?? null,
    projetoJustificativa: projetoDaSemana?.justificativa ?? "",
    materiais: planejamento?.materiais ?? "",
    tardeCulturalApresentacao: planejamento?.tardeCulturalApresentacao ?? "",
    tardeCulturalMateriais: planejamento?.tardeCulturalMateriais ?? "",
    status: planejamento?.status ?? "RASCUNHO",
    comentarioCoordenadora: planejamento?.comentarioCoordenadora ?? "",
    comentarioAutorNome: planejamento?.comentarioAutor?.name ?? "",
    comentarioEm: planejamento?.comentarioEm?.toISOString() ?? null,
    liComentarioEm: planejamento?.liComentarioEm?.toISOString() ?? null,
    dias,
    podeEditar: await podeEscrever(session.user.id, session.user.role, turmaId),
    souCoordenadora: session.user.role === "ADMIN" || !!session.user.coordenaAreaPedagogica,
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

  const existente = await prisma.planejamento.findUnique({
    where: { turmaId_semanaInicio: { turmaId, semanaInicio } },
    select: { status: true },
  });
  // Reenvio depois de devolvido (pedido do dono, set/2026: "aviso automático
  // quando professora reenvia após devolução") — limpa o comentário antigo
  // (senão fica pendurado na tela como se ainda fosse o atual) e avisa quem
  // coordena.
  const reenvioAposDevolucao = existente?.status === "DEVOLVIDO" && status === "ENVIADO";

  let projeto: { nome: string; justificativa: string | null } | null = null;
  if (projetoId) {
    const projetoEncontrado = await prisma.projetoPedagogico.findUnique({ where: { id: projetoId } });
    if (!projetoEncontrado || projetoEncontrado.turmaId !== turmaId) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 400 });
    }
    projeto = { nome: projetoEncontrado.nome, justificativa: projetoEncontrado.justificativa };
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
          ...(reenvioAposDevolucao
            ? { comentarioCoordenadora: null, comentarioAutorId: null, comentarioEm: null, liComentarioEm: null }
            : {}),
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

      // Versionamento (pedido do dono, set/2026: "nunca substitui sem
      // rastro") — 1 snapshot por ENVIO (1ª vez ou reenvio depois de
      // devolvido), nunca em salvamento comum de rascunho.
      if (status === "ENVIADO") {
        const ultimaVersao = await tx.planejamentoVersao.findFirst({
          where: { planejamentoId: registro.id },
          orderBy: { numero: "desc" },
          select: { numero: true },
        });
        const snapshot: SnapshotPlanejamento = {
          projetoNome: projeto?.nome ?? null,
          projetoJustificativa: projeto?.justificativa ?? null,
          materiais,
          tardeCulturalApresentacao,
          tardeCulturalMateriais,
          dias: diasComConteudo.map((d) => ({
            data: isoData(d.data),
            tipo: d.tipo,
            conteudo: d.conteudo,
            especializadas: d.especializadas,
          })),
        };
        await tx.planejamentoVersao.create({
          data: {
            planejamentoId: registro.id,
            numero: (ultimaVersao?.numero ?? 0) + 1,
            conteudo: snapshot,
            enviadoPorId: session.user.id,
          },
        });
      }

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

    if (reenvioAposDevolucao) {
      const coordenadoras = await prisma.user.findMany({ where: { coordenaAreaPedagogica: true }, select: { id: true } });
      await Promise.all(
        coordenadoras.map((c) =>
          criarNotificacao({
            usuarioId: c.id,
            tipo: "PLANEJAMENTO_REENVIADO",
            titulo: `${turma.nome} reenviou o planejamento`,
            corpo: `Semana de ${isoData(semanaInicio)}, depois de devolvido pra revisão.`,
            link: `/pedagogico/planejamento/${turmaId}`,
          })
        )
      );
    }

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
