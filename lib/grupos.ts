import { prisma } from "@/lib/prisma";
import { ROLES_ATIVAS, ROLE_LABEL } from "@/lib/permissoes";

/** Garante que o usuário está no canal do próprio setor e no canal geral "Todos",
 * criando os canais na primeira vez que alguém daquele setor entra no chat. */
export async function garantirCanaisDoUsuario(userId: string, role: string): Promise<void> {
  const canaisNecessarios: { nome: string; roleChave: string }[] = [{ nome: "Todos", roleChave: "TODOS" }];
  if ((ROLES_ATIVAS as readonly string[]).includes(role)) {
    canaisNecessarios.push({ nome: ROLE_LABEL[role] ?? role, roleChave: role });
  }

  for (const canal of canaisNecessarios) {
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
  }
}

export async function contarNaoLidasGrupos(meId: string): Promise<number> {
  const participacoes = await prisma.conversaParticipante.findMany({
    where: { usuarioId: meId },
    select: { conversaId: true, ultimaLeituraEm: true },
  });
  if (participacoes.length === 0) return 0;

  const contagens = await Promise.all(
    participacoes.map((p) =>
      prisma.mensagemGrupo.count({
        where: {
          conversaId: p.conversaId,
          remetenteId: { not: meId },
          createdAt: p.ultimaLeituraEm ? { gt: p.ultimaLeituraEm } : undefined,
        },
      })
    )
  );
  return contagens.reduce((a, b) => a + b, 0);
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
  const participacoes = await prisma.conversaParticipante.findMany({
    where: { usuarioId: meId },
    select: {
      ultimaLeituraEm: true,
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
  });

  return Promise.all(
    participacoes.map(async (p) => {
      const c = p.conversa;
      const ultima = c.mensagens[0];
      const naoLidas = await prisma.mensagemGrupo.count({
        where: {
          conversaId: c.id,
          remetenteId: { not: meId },
          createdAt: p.ultimaLeituraEm ? { gt: p.ultimaLeituraEm } : undefined,
        },
      });
      return {
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        participantesCount: c._count.participantes,
        ultimaMensagem: ultima ? (ultima.conteudo ?? (ultima.anexoNome ? `📎 ${ultima.anexoNome}` : "")) : null,
        ultimaEm: ultima?.createdAt.toISOString() ?? null,
        naoLidas,
      };
    })
  );
}
