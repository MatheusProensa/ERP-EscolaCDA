import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { isoData } from "@/lib/planejamento";

type Evento = {
  tipo: "ENVIADO" | "APROVADO" | "DEVOLVIDO";
  quando: string;
  quem: string;
  comentario: string | null;
  semanaInicio: string;
};

/** Histórico de ações (enviado/aprovado/devolvido) de uma turma, pro painel
 * mestre-detalhe da coordenadora — pedido do dono, mockup do Gemini
 * ("Histórico: Você aprovou o Roteiro · 28/09..."). Não existe log genérico
 * pra isso; sintetiza os eventos a partir do que o versionamento do
 * Planejamento já guarda (PlanejamentoVersao.enviadoEm/decididoEm) — cada
 * versão vira até 2 eventos (envio + decisão, quando já revisada). Só quem
 * coordena (ou ADMIN) vê — mesma regra do endpoint de revisão. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN" && !session.user.coordenaAreaPedagogica) {
    return NextResponse.json({ error: "Só quem coordena a Área Pedagógica vê o histórico" }, { status: 403 });
  }

  const turmaId = req.nextUrl.searchParams.get("turmaId");
  if (!turmaId) return NextResponse.json({ error: "Informe turmaId" }, { status: 400 });

  try {
    const versoes = await prisma.planejamentoVersao.findMany({
      where: { planejamento: { turmaId } },
      orderBy: { enviadoEm: "desc" },
      take: 15,
      select: {
        enviadoEm: true,
        enviadoPor: { select: { name: true } },
        veredito: true,
        comentario: true,
        decididoPor: { select: { name: true } },
        decididoEm: true,
        planejamento: { select: { semanaInicio: true } },
      },
    });

    const eventos: Evento[] = [];
    for (const v of versoes) {
      eventos.push({
        tipo: "ENVIADO",
        quando: v.enviadoEm.toISOString(),
        quem: v.enviadoPor.name,
        comentario: null,
        semanaInicio: isoData(v.planejamento.semanaInicio),
      });
      if (v.decididoEm && v.decididoPor && v.veredito) {
        eventos.push({
          tipo: v.veredito === "APROVADO" ? "APROVADO" : "DEVOLVIDO",
          quando: v.decididoEm.toISOString(),
          quem: v.decididoPor.name,
          comentario: v.comentario,
          semanaInicio: isoData(v.planejamento.semanaInicio),
        });
      }
    }
    eventos.sort((a, b) => b.quando.localeCompare(a.quando));

    return NextResponse.json({ eventos: eventos.slice(0, 8) });
  } catch (err) {
    return erroApi(err);
  }
}
