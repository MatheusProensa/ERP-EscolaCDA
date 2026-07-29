import { Megaphone } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmarLeituraButton } from "@/components/modules/dashboard/ConfirmarLeituraButton";

export async function AvisoFixadoBanner() {
  const session = await auth();

  const aviso = await prisma.muralAviso.findFirst({
    where: { fixado: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titulo: true,
      conteudo: true,
      _count: { select: { leituras: true } },
      leituras: { where: { userId: session!.user.id }, select: { id: true } },
    },
  });

  if (!aviso) return null;

  return (
    <Card className="flex items-center gap-3.5 border-cda-yellow/40 bg-cda-yellow/[0.08] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cda-yellow/25">
        <Megaphone className="h-4 w-4 text-cda-amber" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-cda-text">{aviso.titulo}</p>
        <p className="line-clamp-1 text-sm text-cda-text2">{aviso.conteudo}</p>
        <p className="mt-0.5 text-xs text-cda-text3">{aviso._count.leituras} confirmaram a leitura</p>
      </div>
      <ConfirmarLeituraButton avisoId={aviso.id} confirmadoInicial={aviso.leituras.length > 0} />
      <Button href="/mural" variant="outline" className="shrink-0">
        Ver detalhes
      </Button>
    </Card>
  );
}
