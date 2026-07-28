import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatApp } from "@/components/modules/chat/ChatApp";

export default async function ChatPage() {
  const session = await auth();

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Chat" subtitle="Converse com outros perfis do sistema" />
      <ChatApp meId={session!.user.id} />
    </div>
  );
}
