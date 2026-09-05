import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES_ATIVAS, acessoPermitido } from "@/lib/permissoes";
import { gerarSenhaAleatoria } from "@/lib/senha";
import { validarUploadDataUri } from "@/lib/validarUpload";
import { erroApi } from "@/lib/apiError";

// Agora edita nome/email além do perfil — antes só dava pra trocar o perfil por
// aqui, então as contas genéricas de seed ("Direção CDA" etc.) não tinham como
// virar o nome de verdade de quem usa cada login.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { role, name, email, foto } = body;

  const atual = await prisma.user.findUnique({ where: { id } });
  if (!atual) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const data: { role?: Role; name?: string; email?: string; foto?: string | null } = {};

  if (role !== undefined) {
    if (!ROLES_ATIVAS.includes(role)) return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    if (id === session.user.id && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não pode remover seu próprio acesso de administrador" }, { status: 400 });
    }
    data.role = role as Role;
  }

  if (name !== undefined) {
    const nomeLimpo = String(name).trim();
    if (!nomeLimpo) return NextResponse.json({ error: "Nome não pode ficar em branco" }, { status: 400 });
    data.name = nomeLimpo;
  }

  if (email !== undefined) {
    const emailLimpo = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (emailLimpo !== atual.email) {
      const existente = await prisma.user.findUnique({ where: { email: emailLimpo } });
      if (existente) return NextResponse.json({ error: "Já existe um usuário com esse email" }, { status: 409 });
    }
    data.email = emailLimpo;
  }

  if (foto !== undefined) {
    if (foto === null) {
      data.foto = null;
    } else {
      const validacao = validarUploadDataUri(foto);
      if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });
      data.foto = foto;
    }
  }

  const usuario = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, foto: true, createdAt: true },
  });

  const mudancas: string[] = [];
  if (data.name && data.name !== atual.name) mudancas.push(`nome de "${atual.name}" para "${data.name}"`);
  if (data.email && data.email !== atual.email) mudancas.push(`email de "${atual.email}" para "${data.email}"`);
  if (data.role && data.role !== atual.role) mudancas.push(`perfil de ${atual.role} para ${data.role}`);
  if (foto !== undefined && foto !== atual.foto) mudancas.push(foto ? "foto atualizada" : "foto removida");
  if (mudancas.length > 0) {
    await prisma.logAtividade.create({
      data: {
        acao: `Usuário editado (${mudancas.join(", ")})`,
        entidade: "Usuario",
        entidadeId: id,
        usuario: session.user.name ?? "Usuário",
      },
    });
  }

  return NextResponse.json(usuario);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const { id } = await params;
  // Deixa escolher a senha (senhaEscolhida) em vez de só gerar uma aleatória
  // difícil de digitar/lembrar — se não vier nada, gera automática como antes.
  const body = await req.json().catch(() => ({}));
  const senhaEscolhida = typeof body?.senha === "string" ? body.senha.trim() : "";
  if (senhaEscolhida && senhaEscolhida.length < 4) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 4 caracteres." }, { status: 400 });
  }
  const senha = senhaEscolhida || gerarSenhaAleatoria();
  const hash = await bcrypt.hash(senha, 10);

  // Limpa o pedido de "esqueci minha senha", se tinha um pendente — foi
  // atendido agora.
  await prisma.user.update({ where: { id }, data: { password: hash, pedidoResetSenhaEm: null } });

  return NextResponse.json({ senha });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
  }

  const alvo = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  try {
    // Mensagem/Notificacao apontam pro User sem onDelete em cascata — excluir
    // direto quebrava com erro de chave estrangeira pra qualquer conta que já
    // mandou/recebeu mensagem no chat ou teve notificação (praticamente toda
    // conta usada de verdade). Apaga esse rastro junto, dentro da mesma
    // transação, antes de apagar o usuário.
    await prisma.$transaction([
      prisma.notificacao.deleteMany({ where: { usuarioId: id } }),
      prisma.mensagem.deleteMany({ where: { OR: [{ remetenteId: id }, { destinatarioId: id }] } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await prisma.logAtividade.create({
      data: {
        acao: `Usuário excluído (${alvo.name})`,
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
