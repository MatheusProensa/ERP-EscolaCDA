import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { rotaPermitida } from "@/lib/permissoes";

// Usa só a config leve (sem Credentials/bcrypt/Prisma) — o middleware roda em
// toda navegação e só precisa ler o JWT da sessão, não fazer login de verdade.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login");
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
    if (!rotaPermitida(pathname, role)) {
      if (isApi) return NextResponse.json({ error: "Sem permissão para este setor" }, { status: 403 });
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
