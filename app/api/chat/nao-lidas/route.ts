import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { contarNaoLidas } from "@/lib/chat";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const total = await contarNaoLidas(session.user.id);
  return NextResponse.json({ total });
}
