import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { MODULOS, type NivelPermissao } from "@/lib/permissoes";

const NIVEIS_VALIDOS = ["HERDAR", "NENHUM", "VER", "EDITAR"] as const;
const CHAVES_VALIDAS = new Set(MODULOS.map((m) => m.chave));

/** Salva as permissões granulares por módulo de uma pessoa. "HERDAR" apaga o
 * override (volta a usar só o pacote padrão do Role). Efeito só vale a partir
 * do próximo login dessa pessoa — a sessão já aberta guarda as permissões no
 * token, igual já acontecia com troca de Role. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const permissoes = body?.permissoes;
  if (!permissoes || typeof permissoes !== "object") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  // O front manda o objeto inteiro (não só o que mudou) — pra saber se a
  // pessoa está de fato TENTANDO mudar a própria permissão de Usuários (e
  // barrar isso), precisa comparar com o que já tá salvo, não só olhar o
  // valor mandado (senão rejeitava até salvar outro setor sem mexer nesse).
  const permissaoUsuariosAtual = id === session.user.id
    ? await prisma.permissaoUsuario.findUnique({ where: { userId_modulo: { userId: id, modulo: "usuarios" } } })
    : null;
  const nivelUsuariosAtual = permissaoUsuariosAtual?.nivel ?? "HERDAR";

  const entradas = Object.entries(permissoes as Record<string, string>);
  for (const [chave, nivel] of entradas) {
    if (!CHAVES_VALIDAS.has(chave)) return NextResponse.json({ error: `Módulo desconhecido: ${chave}` }, { status: 400 });
    if (!NIVEIS_VALIDOS.includes(nivel as (typeof NIVEIS_VALIDOS)[number])) {
      return NextResponse.json({ error: `Nível inválido pra ${chave}` }, { status: 400 });
    }
    // Ninguém mexe na própria permissão de Usuários — evita se trancar fora
    // da própria tela de permissões sem ter como voltar atrás.
    if (id === session.user.id && chave === "usuarios" && nivel !== nivelUsuariosAtual) {
      return NextResponse.json({ error: "Você não pode alterar sua própria permissão em Usuários" }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(
      entradas.map(([chave, nivel]) =>
        nivel === "HERDAR"
          ? prisma.permissaoUsuario.deleteMany({ where: { userId: id, modulo: chave } })
          : prisma.permissaoUsuario.upsert({
              where: { userId_modulo: { userId: id, modulo: chave } },
              create: { userId: id, modulo: chave, nivel: nivel as NivelPermissao },
              update: { nivel: nivel as NivelPermissao },
            })
      )
    );

    await prisma.logAtividade.create({
      data: {
        acao: `Permissões de ${alvo.name} atualizadas`,
        entidade: "Usuario",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erroApi(err);
  }
}
