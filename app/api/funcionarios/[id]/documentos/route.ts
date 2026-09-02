import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarUploadDataUri } from "@/lib/validarUpload";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tipo, nomeArquivo, arquivo } = body;

  if (!tipo || !nomeArquivo || !arquivo) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // A checagem de tipo/tamanho do lado do cliente é fácil de burlar chamando a
  // API direto (achado da auditoria ago/2026) — validação que importa é aqui.
  const validacao = validarUploadDataUri(arquivo);
  if (!validacao.ok) {
    return NextResponse.json({ error: validacao.erro }, { status: 400 });
  }

  const documento = await prisma.documentoFuncionario.create({
    data: { funcionarioId: id, tipo, nomeArquivo, arquivo },
  });

  return NextResponse.json(documento, { status: 201 });
}
