import { prisma } from "@/lib/prisma";
import { ROLES_ATIVAS, ROLE_LABEL } from "@/lib/permissoes";

/** Garante que o usuário está no canal do próprio setor e no canal geral "Todos",
 * criando os canais na primeira vez que alguém daquele setor entra no chat. */
export async function garantirCanaisDoUsuario(userId: string, role: string): Promise<void> {
  const canaisNecessarios: { nome: string; roleChave: string }[] = [{ nome: "Todos", roleChave: "TODOS" }];
  if ((ROLES_ATIVAS as readonly string[]).includes(role)) {
    canaisNecessarios.push({ nome: ROLE_LABEL[role] ?? role, roleChave: role });
  }

  // "Todos" e o canal do próprio setor são independentes um do outro — resolve
  // os dois em paralelo em vez de round-trips sequenciais.
  await Promise.all(
    canaisNecessarios.map(async (canal) => {
      const conversa = await prisma.conversa.upsert({
        where: { tipo_role: { tipo: "SETOR", role: canal.roleChave } },
        update: {},
        create: { tipo: "SETOR", role: canal.roleChave, nome: canal.nome },
      });
      await prisma.conversaParticipante.upsert({
        where: { conversaId_usuarioId: { conversaId: conversa.id, usuarioId: userId } },
        update: {},
        create: { conversaId: conversa.id, usuarioId: userId },
      });
    })
  );
}

/** Não lidas de todos os canais/grupos do usuário numa query só — cada
 * participação tem seu próprio corte de "última leitura", então em vez de
 * rodar um count por conversa (N queries, N crescendo a cada grupo que a
 * pessoa entra), o corte por linha vira uma condição de JOIN e o banco
 * resolve tudo de uma vez. */
export async function contarNaoLidasPorConversa(meId: string): Promise<Map<string, number>> {
  const linhas = await prisma.$queryRaw<{ conversaId: string; naoLidas: bigint }[]>`
    SELECT cp."conversaId" as "conversaId", COUNT(mg.id) as "naoLidas"
    FROM "ConversaParticipante" cp
    JOIN "MensagemGrupo" mg ON mg."conversaId" = cp."conversaId"
      AND mg."remetenteId" != cp."usuarioId"
      AND (cp."ultimaLeituraEm" IS NULL OR mg."createdAt" > cp."ultimaLeituraEm")
    WHERE cp."usuarioId" = ${meId}
    GROUP BY cp."conversaId"
  `;
  return new Map(linhas.map((l) => [l.conversaId, Number(l.naoLidas)]));
}

export async function contarNaoLidasGrupos(meId: string): Promise<number> {
  const porConversa = await contarNaoLidasPorConversa(meId);
  let total = 0;
  for (const n of porConversa.values()) total += n;
  return total;
}

export type GrupoResumo = {
  id: string;
  nome: string;
  tipo: "GRUPO" | "SETOR";
  participantesCount: number;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
};

export async function listarGrupos(meId: string): Promise<GrupoResumo[]> {
  const [participacoes, naoLidasPorConversa] = await Promise.all([
    prisma.conversaParticipante.findMany({
      where: { usuarioId: meId },
      select: {
        conversa: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            _count: { select: { participantes: true } },
            mensagens: {
              where: { excluida: false },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { conteudo: true, anexoNome: true, createdAt: true },
            },
          },
        },
      },
    }),
    contarNaoLidasPorConversa(meId),
  ]);

  return participacoes.map((p) => {
    const c = p.conversa;
    const ultima = c.mensagens[0];
    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      participantesCount: c._count.participantes,
      ultimaMensagem: ultima ? (ultima.conteudo ?? (ultima.anexoNome ? `📎 ${ultima.anexoNome}` : "")) : null,
      ultimaEm: ultima?.createdAt.toISOString() ?? null,
      naoLidas: naoLidasPorConversa.get(c.id) ?? 0,
    };
  });
}
