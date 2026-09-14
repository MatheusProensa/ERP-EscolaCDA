import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";

/** Se a pessoa logada já viu o tutorial guiado de um módulo (ex.:
 * "pedagogico") — sem restrição de Role/setor, é sempre sobre o PRÓPRIO
 * usuário. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const modulo = req.nextUrl.searchParams.get("modulo");
  if (!modulo) return NextResponse.json({ error: "Informe modulo" }, { status: 400 });

  const visto = await prisma.tutorialVisto.findUnique({ where: { userId_modulo: { userId: session.user.id, modulo } } });
  return NextResponse.json({ visto: !!visto });
}

/** Marca que a pessoa logada já viu o tutorial de um módulo — dispensando o
 * tour automático nas próximas vezes (continua re-abrível pelo botão "?"). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const modulo = String(body?.modulo ?? "");
  if (!modulo) return NextResponse.json({ error: "Informe modulo" }, { status: 400 });

  try {
    await prisma.tutorialVisto.upsert({
      where: { userId_modulo: { userId: session.user.id, modulo } },
      create: { userId: session.user.id, modulo },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
