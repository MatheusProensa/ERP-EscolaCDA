import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES_ATIVAS } from "@/lib/permissoes";
import { gerarSenhaAleatoria } from "@/lib/senha";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { role } = body;

  if (!role || !ROLES_ATIVAS.includes(role)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }
  if (id === session.user.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso de administrador" }, { status: 400 });
  }

  const usuario = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(usuario);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
