import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { acessoPermitido } from "@/lib/permissoes";

// Usa só a config leve (sem Credentials/bcrypt/Prisma) — o middleware roda em
// toda navegação e só precisa ler o JWT da sessão, não fazer login de verdade.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login") || pathname.startsWith("/esqueci-senha");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api");
  // Link público de assinatura de contrato (app/assinar/[token]) — o
  // responsável abre sem ter conta nenhuma no sistema.
  const isAssinaturaPublica = pathname.startsWith("/assinar") || pathname.startsWith("/api/assinar");

  if (isAuthApi || isAssinaturaPublica) return;

  if (!isLoggedIn && !isLoginPage) {
    if (isApi) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (isLoggedIn) {
    const role = req.auth!.user!.role as string;
    const permissoes = req.auth!.user!.permissoes;
    if (!acessoPermitido(pathname, req.method, role, permissoes)) {
      if (isApi) return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }
});

export const config = {
  // Faltava excluir arquivo estático solto na raiz de public/ (ex.: logo-cda.png,
  // ficha-matricula-fundo.png) — sem login, esse pedido caía no redirect pro
  // /login como qualquer outra rota, então a própria tela de login não
  // conseguia carregar o logo (pedia login pra ver a imagem do... login).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
