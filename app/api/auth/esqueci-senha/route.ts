import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rota pública (sem provedor de e-mail configurado): só marca o pedido no
// cadastro do usuário — quem redefine de fato é um ADMIN/DIREÇÃO na tela de
// Usuários (fluxo que já existia), gerando uma senha nova e passando por
// fora do sistema (WhatsApp, pessoalmente etc.).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Sempre responde igual, ache ou não o e-mail — não dá pra alguém de fora
    // descobrir quais e-mails têm conta só de tentar aqui.
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { pedidoResetSenhaEm: new Date() } });
    }
  }

  return NextResponse.json({ ok: true });
}
