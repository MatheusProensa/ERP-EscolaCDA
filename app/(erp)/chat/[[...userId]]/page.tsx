import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatApp } from "@/components/modules/chat/ChatApp";
import { listarConversas } from "@/lib/chat";

export default async function ChatPage({ params }: { params: Promise<{ userId?: string[] }> }) {
  const { userId } = await params;
  const session = await auth();
  // Foto de quem está logado vem direto do banco (não do token da sessão) —
  // mesmo motivo do layout do ERP: se a pessoa acabou de trocar a foto, ela
  // já aparece na hora nas mensagens dela, sem precisar sair e entrar de novo.
  const [conversasIniciais, eu] = await Promise.all([
    listarConversas(session!.user.id),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { foto: true } }),
  ]);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Chat" subtitle="Converse com outros perfis do sistema" />
      <ChatApp
        meId={session!.user.id}
        meNome={session!.user.name ?? "Você"}
        meFoto={eu?.foto}
        selecionadoInicial={userId?.[0]}
        conversasIniciais={conversasIniciais}
      />
    </div>
  );
}
