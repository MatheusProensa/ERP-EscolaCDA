import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avisarMudanca } from "@/lib/liveUpdate";
import { validarUploadDataUri } from "@/lib/validarUpload";

// 10MB — pedido do dono, out/2026 ("upload direto de PDF"), maior que o
// limite padrão de 5MB do resto do sistema (foto, documento de funcionário)
// porque documento institucional (contrato, apólice) tende a ser mais pesado.
const LIMITE_ARQUIVO_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const documentos = await prisma.documentoInstitucional.findMany({
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
  });
  return NextResponse.json(documentos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const { titulo, categoria, link, arquivo, nomeArquivo, validade, observacao } = body;

  if (!titulo || !categoria) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (!link?.trim() && !arquivo) {
    return NextResponse.json({ error: "Informe um link ou envie um arquivo PDF" }, { status: 400 });
  }
  if (arquivo) {
    // A checagem de tipo/tamanho do lado do cliente é fácil de burlar chamando
    // a API direto (mesmo cuidado já tomado no upload de Funcionários) —
    // validação que importa é aqui.
    const validacao = validarUploadDataUri(arquivo, LIMITE_ARQUIVO_BYTES);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
    if (!nomeArquivo?.trim()) return NextResponse.json({ error: "Nome do arquivo ausente" }, { status: 400 });
  }

  const documento = await prisma.documentoInstitucional.create({
    data: {
      titulo,
      categoria,
      link: link?.trim() || null,
      arquivo: arquivo || null,
      nomeArquivo: arquivo ? nomeArquivo.trim() : null,
      validade: validade ? new Date(validade) : null,
      observacao: observacao || null,
    },
  });

  after(() => avisarMudanca("documentos"));
  return NextResponse.json(documento, { status: 201 });
}
