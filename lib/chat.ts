import { prisma } from "@/lib/prisma";

export async function contarNaoLidas(meId: string): Promise<number> {
  return prisma.mensagem.count({ where: { destinatarioId: meId, lida: false } });
}

export type ConversaResumo = {
  id: string;
  name: string;
  role: string;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
};

export async function listarConversas(meId: string): Promise<ConversaResumo[]> {
  const [usuarios, mensagens, naoLidasPorRemetente] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: meId } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    // Só serve pra achar a última mensagem de cada conversa (preview) — 100 é de
    // sobra pra isso mesmo com bastante gente cadastrada.
    prisma.mensagem.findMany({
      where: { OR: [{ remetenteId: meId }, { destinatarioId: meId }] },
      select: { remetenteId: true, destinatarioId: true, conteudo: true, anexoNome: true, createdAt: true, excluida: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Contagem de não lidas via agregação direta no banco — correta independente
    // de quantas mensagens existem no total (antes dependia do mesmo lote de 300
    // usado pro preview, então uma conversa muito falada podia "esconder" o não
    // lido de outra).
    prisma.mensagem.groupBy({
      by: ["remetenteId"],
      where: { destinatarioId: meId, lida: false },
      _count: { _all: true },
    }),
  ]);

  const naoLidasPorId = new Map(naoLidasPorRemetente.map((g) => [g.remetenteId, g._count._all]));

  const ultimaPorUsuario = new Map<string, { conteudo: string | null; anexoNome: string | null; createdAt: Date; excluida: boolean }>();
  for (const m of mensagens) {
    const outro = m.remetenteId === meId ? m.destinatarioId : m.remetenteId;
    if (!ultimaPorUsuario.has(outro)) {
      ultimaPorUsuario.set(outro, { conteudo: m.conteudo, anexoNome: m.anexoNome, createdAt: m.createdAt, excluida: m.excluida });
    }
  }

  return usuarios.map((u) => {
    const info = ultimaPorUsuario.get(u.id);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      ultimaMensagem: info
        ? info.excluida
          ? "Mensagem apagada"
          : (info.conteudo ?? (info.anexoNome ? `📎 ${info.anexoNome}` : ""))
        : null,
      ultimaEm: info?.createdAt.toISOString() ?? null,
      naoLidas: naoLidasPorId.get(u.id) ?? 0,
    };
  });
}
