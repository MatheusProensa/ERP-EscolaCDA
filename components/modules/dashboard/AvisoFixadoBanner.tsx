import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export async function AvisoFixadoBanner() {
  const aviso = await prisma.muralAviso.findFirst({
    where: { fixado: true },
    orderBy: { createdAt: "desc" },
    select: { titulo: true, conteudo: true },
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
      </div>
      <Button href="/mural" className="shrink-0 bg-cda-navy hover:bg-cda-navy/90">
        Ver mural
      </Button>
    </Card>
  );
}
