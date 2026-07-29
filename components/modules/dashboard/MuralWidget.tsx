import { Megaphone, Pin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { formatarDataHora } from "@/lib/utils";
import { ConfirmarLeituraButton } from "@/components/modules/dashboard/ConfirmarLeituraButton";

export async function MuralWidget() {
  const session = await auth();

  const avisos = await prisma.muralAviso.findMany({
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      titulo: true,
      conteudo: true,
      autor: true,
      fixado: true,
      createdAt: true,
      _count: { select: { leituras: true } },
      leituras: { where: { userId: session!.user.id }, select: { id: true } },
    },
  });

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Megaphone className="h-[15px] w-[15px] text-cda-blue" />
          Mural de avisos
        </span>
      }
      action={
        <Button href="/mural" variant="outline" size="sm">
          Ver mural
        </Button>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {avisos.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum aviso publicado ainda.</p>
        )}
        {avisos.map((aviso) => (
          <div key={aviso.id} className="flex items-start gap-3 p-4">
            <Avatar nome={aviso.autor} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {aviso.fixado && <Pin className="h-3.5 w-3.5 shrink-0 text-cda-amber" />}
                <p className="text-[15px] font-semibold text-cda-text">{aviso.titulo}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-cda-text2">{aviso.conteudo}</p>
              <p className="mt-1.5 text-xs text-cda-text3">
                {aviso.autor} · {formatarDataHora(aviso.createdAt)}
              </p>
              {aviso.fixado && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ConfirmarLeituraButton avisoId={aviso.id} confirmadoInicial={aviso.leituras.length > 0} />
                  <Button href="/mural" variant="outline" size="sm">
                    Ver detalhes
                  </Button>
                  <span className="text-xs text-cda-text3">{aviso._count.leituras} confirmaram</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
