import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatApp } from "@/components/modules/chat/ChatApp";
import { listarConversas } from "@/lib/chat";

export default async function ChatPage({ params }: { params: Promise<{ userId?: string[] }> }) {
  const { userId } = await params;
  const session = await auth();
  const conversasIniciais = await listarConversas(session!.user.id);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Chat" subtitle="Converse com outros perfis do sistema" />
      <ChatApp
        meId={session!.user.id}
        meNome={session!.user.name ?? "Você"}
        selecionadoInicial={userId?.[0]}
        conversasIniciais={conversasIniciais}
      />
    </div>
  );
}
