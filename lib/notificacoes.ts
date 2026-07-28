import { prisma } from "@/lib/prisma";

export async function criarNotificacao(params: {
  usuarioId: string;
  tipo: string;
  titulo: string;
  corpo?: string;
  link?: string;
}) {
  return prisma.notificacao.create({
    data: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      titulo: params.titulo,
      corpo: params.corpo ?? null,
      link: params.link ?? null,
    },
  });
}
