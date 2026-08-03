import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** O ano letivo ativo só muda manualmente, raramente (uma vez por ano) — direto
 * no banco. Antes, quase toda página do sistema fazia essa mesma consulta de
 * novo a cada navegação. Cacheado por 1h em vez de bater no banco toda vez. */
export const getAnoLetivoAtivo = unstable_cache(
  async () => prisma.anoLetivo.findFirst({ where: { ativo: true } }),
  ["ano-letivo-ativo"],
  { revalidate: 3600 }
);
