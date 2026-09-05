import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

// Esqueleto dedicado (não o genérico PaginaCarregando) — o Chat usa uma altura
// fixa de tela cheia (h-[calc(100vh-7.5rem)]) com sidebar de conversas +
// painel de mensagens lado a lado; um esqueleto genérico de lista/cartões
// pularia o layout na hora que o ChatApp real montasse.
export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Chat" subtitle="Converse com outros perfis do sistema" />
      <div className="flex flex-1 gap-4 overflow-hidden rounded-[10px] border border-cda-border bg-white p-3">
        <div className="flex w-64 shrink-0 flex-col gap-2 border-r border-cda-border pr-3">
          <Skeleton variant="block" count={6} className="h-14" />
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 p-2">
          <Skeleton variant="block" className="h-10 w-2/3" />
          <Skeleton variant="block" className="ml-auto h-10 w-1/2" />
          <Skeleton variant="block" className="h-10 w-3/5" />
        </div>
      </div>
    </div>
  );
}
