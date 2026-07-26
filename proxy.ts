import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rotaPermitida } from "@/lib/permissoes";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api");

  if (isAuthApi) return;

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
