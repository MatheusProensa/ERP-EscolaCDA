import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS_EVENTO } from "@/lib/calendario";
import { formatarData } from "@/lib/utils";
import { erroApi } from "@/lib/apiError";

const GESTAO = ["ADMIN", "DIRECAO"];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const mes = params.get("mes");
  const ano = params.get("ano");
  const desde = params.get("desde");
  const limite = params.get("limite");

  // "desde" ignora o mês em exibição no grid — usado pelo painel "Próximos eventos"
  // pra continuar mostrando itens mesmo quando o mês atual está acabando.
  const where = desde
    ? { data: { gte: new Date(desde) } }
    : mes && ano
      ? {
          data: {
            gte: new Date(Date.UTC(Number(ano), Number(mes) - 1, 1)),
            lt: new Date(Date.UTC(Number(ano), Number(mes), 1)),
          },
        }
      : undefined;

  const eventos = await prisma.eventoCalendario.findMany({
    where,
    orderBy: { data: "asc" },
    take: limite ? Number(limite) : undefined,
  });
  return NextResponse.json(eventos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const { titulo, data, categoria, descricao, publicarMural } = body;
  if (!titulo || !data || !categoria) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (!CATEGORIAS_EVENTO.includes(categoria)) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
  }

  try {
    const evento = await prisma.$transaction(async (tx) => {
      const novoEvento = await tx.eventoCalendario.create({
        data: { titulo, data: new Date(data), categoria, descricao: descricao || null },
      });

      if (publicarMural) {
        await tx.muralAviso.create({
          data: {
            titulo: `📅 ${titulo}`,
            conteudo: `${descricao ? `${descricao}\n\n` : ""}Data: ${formatarData(novoEvento.data)} · ${categoria}`,
            autor: session.user.name ?? "Usuário",
          },
        });
      }

      return novoEvento;
    });

    return NextResponse.json(evento, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
