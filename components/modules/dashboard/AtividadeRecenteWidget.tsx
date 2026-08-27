import Link from "next/link";
import { History } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatarDataHora } from "@/lib/utils";

/** Só o Admin vê — mesma restrição da página /log-atividades. Fica de fora do
 * dashboard pra quem não tem esse acesso (não é null visível, some mesmo). */
export async function AtividadeRecenteWidget() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return null;

  const logs = await prisma.logAtividade.findMany({ orderBy: { createdAt: "desc" }, take: 5 });

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <History className="h-[15px] w-[15px] text-cda-blue" />
          Atividade recente
        </span>
      }
      action={
        <Link href="/log-atividades" className="text-sm font-medium text-cda-blue hover:underline">
          Ver tudo
        </Link>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {logs.length === 0 && <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhuma atividade ainda.</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-0.5 px-4 py-2.5">
            <p className="truncate text-sm text-cda-text">{log.acao}</p>
            <p className="text-xs text-cda-text3">
              {log.usuario} · {formatarDataHora(log.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
