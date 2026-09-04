import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ano = Number(req.nextUrl.searchParams.get("ano")) || new Date().getFullYear();
  const blocos = await prisma.escalaEquipeBloco.findMany({
    where: { ano },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(blocos);
}
