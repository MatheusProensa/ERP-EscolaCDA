import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { contarNaoLidas } from "@/lib/chat";
import { contarNaoLidasGrupos } from "@/lib/grupos";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [diretas, grupos] = await Promise.all([
    contarNaoLidas(session.user.id),
    contarNaoLidasGrupos(session.user.id),
  ]);
  return NextResponse.json({ total: diretas + grupos });
}
