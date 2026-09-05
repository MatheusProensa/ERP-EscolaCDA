import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES_ATIVAS, acessoPermitido } from "@/lib/permissoes";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const usuarios = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(usuarios);
}

// Cria usuário — inclusive com perfil Admin. Confere de novo aqui dentro (não
// só no middleware): é a rota que decide quem entra no sistema e com que
// nível de acesso, não pode depender só do matcher do middleware.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!acessoPermitido(req.nextUrl.pathname, req.method, session.user.role, session.user.permissoes)) {
    return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (!ROLES_ATIVAS.includes(role)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "A senha precisa de pelo menos 6 caracteres" }, { status: 400 });
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ error: "Já existe um usuário com esse email" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.user.create({
    data: { name, email, password: hash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
