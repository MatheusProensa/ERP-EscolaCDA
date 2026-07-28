import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarConversas } from "@/lib/chat";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await listarConversas(session.user.id);
  return NextResponse.json(lista);
}
