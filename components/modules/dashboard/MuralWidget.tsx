import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatarDataHora } from "@/lib/utils";

export async function MuralWidget() {
  const avisos = await prisma.muralAviso.findMany({
    orderBy: [{ fixado: "desc" }, { createdAt: "desc" }],
    take: 4,
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
        <Link href="/mural" className="text-sm font-medium text-cda-blue hover:underline">
          Ver mural
        </Link>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {avisos.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum aviso publicado ainda.</p>
        )}
        {avisos.map((aviso) => (
          <div key={aviso.id} className="px-5 py-3">
            <div className="flex items-center gap-1.5">
              {aviso.fixado && <Pin className="h-3 w-3 shrink-0 text-cda-amber" />}
              <p className="truncate text-sm font-semibold text-cda-text">{aviso.titulo}</p>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-cda-text2">{aviso.conteudo}</p>
            <p className="mt-1 text-[11px] text-cda-text3">
              {aviso.autor} · {formatarDataHora(aviso.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
