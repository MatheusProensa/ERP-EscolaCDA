import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avisarMudanca } from "@/lib/liveUpdate";
import { validarUploadDataUri } from "@/lib/validarUpload";

// Mesmo limite do POST — ver app/api/documentos/route.ts.
const LIMITE_ARQUIVO_BYTES = 20 * 1024 * 1024;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { titulo, categoria, link, arquivo, nomeArquivo, validade, observacao } = body;

  // Trocar por um arquivo novo (re-upload) — mesma validação do POST. Trocar
  // só o link não mexe no arquivo já salvo, e vice-versa: cada campo só é
  // gravado quando vem preenchido no corpo (comportamento de sempre aqui).
  if (arquivo) {
    const validacao = validarUploadDataUri(arquivo, LIMITE_ARQUIVO_BYTES);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
    if (!nomeArquivo?.trim()) return NextResponse.json({ error: "Nome do arquivo ausente" }, { status: 400 });
  }

  const documento = await prisma.documentoInstitucional.update({
    where: { id },
    data: {
      titulo: titulo || undefined,
      categoria: categoria || undefined,
      link: link !== undefined ? link?.trim() || null : undefined,
      arquivo: arquivo || undefined,
      nomeArquivo: arquivo ? nomeArquivo.trim() : undefined,
      validade: validade !== undefined ? (validade ? new Date(validade) : null) : undefined,
      observacao: observacao !== undefined ? observacao || null : undefined,
    },
  });

  after(() => avisarMudanca("documentos"));
  return NextResponse.json(documento);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await prisma.documentoInstitucional.delete({ where: { id } });
  after(() => avisarMudanca("documentos"));
  return NextResponse.json({ ok: true });
}
