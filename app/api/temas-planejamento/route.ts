import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";

/** Lista os temas de planejamento — qualquer pessoa da Área Pedagógica lê (é
 * o "cardápio" de temas prontos pra escolher na hora de montar o
 * planejamento semanal da turma), só a coordenadora cria. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const temas = await prisma.temaPlanejamento.findMany({ orderBy: { titulo: "asc" } });
  return NextResponse.json(temas);
}

/** Cadastro de tema pronto (achado confirmado, out/2026: a coordenação
 * prepara o "layout" do tema, a professora só preenche dia a dia em cima
 * dele). Só quem coordena a Área Pedagógica (ou ADMIN) cria — não é uma
 * permissão de módulo inteiro (grade de Usuários), é a marcação
 * coordenaAreaPedagogica no próprio usuário. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN" && !session.user.coordenaAreaPedagogica) {
    return NextResponse.json({ error: "Só a coordenadora da Área Pedagógica cadastra temas" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const titulo = String(body?.titulo ?? "").trim();
  const estrutura = body?.estrutura ? String(body.estrutura).trim() : null;
  if (!titulo) return NextResponse.json({ error: "Informe o título do tema" }, { status: 400 });

  try {
    const tema = await prisma.temaPlanejamento.create({
      data: { titulo, estrutura, criadoPorId: session.user.id },
    });

    await prisma.logAtividade.create({
      data: {
        acao: `Tema de planejamento criado (${titulo})`,
        entidade: "TemaPlanejamento",
        entidadeId: tema.id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    after(() => avisarMudanca("pedagogico"));
    return NextResponse.json(tema, { status: 201 });
  } catch (err) {
    return erroApi(err);
  }
}
