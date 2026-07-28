import { prisma } from "@/lib/prisma";

export type ConversaResumo = {
  id: string;
  name: string;
  role: string;
  ultimaMensagem: string | null;
  ultimaEm: string | null;
  naoLidas: number;
};

export async function listarConversas(meId: string): Promise<ConversaResumo[]> {
  const [usuarios, mensagens] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: meId } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.mensagem.findMany({
      where: { OR: [{ remetenteId: meId }, { destinatarioId: meId }] },
      select: {
        remetenteId: true,
        destinatarioId: true,
        conteudo: true,
        anexoNome: true,
        createdAt: true,
        lida: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const porUsuario = new Map<
    string,
    { conteudo: string | null; anexoNome: string | null; createdAt: Date; naoLidas: number }
  >();

  for (const m of mensagens) {
    const outro = m.remetenteId === meId ? m.destinatarioId : m.remetenteId;
    let info = porUsuario.get(outro);
    if (!info) {
      info = { conteudo: m.conteudo, anexoNome: m.anexoNome, createdAt: m.createdAt, naoLidas: 0 };
      porUsuario.set(outro, info);
    }
    if (m.destinatarioId === meId && !m.lida) info.naoLidas++;
  }

  return usuarios.map((u) => {
    const info = porUsuario.get(u.id);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      ultimaMensagem: info ? (info.conteudo ?? (info.anexoNome ? `📎 ${info.anexoNome}` : "")) : null,
      ultimaEm: info?.createdAt.toISOString() ?? null,
      naoLidas: info?.naoLidas ?? 0,
    };
  });
}
