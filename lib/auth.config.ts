import type { NextAuthConfig } from "next-auth";
import type { PermissoesPorModulo } from "@/lib/permissoes";

/**
 * Config "leve" só com o essencial pra decodificar o JWT da sessão — sem
 * providers (Credentials), sem bcryptjs e sem Prisma. Usada pelo proxy.ts
 * (middleware, roda em TODA navegação/request) pra não arrastar o client do
 * banco e o bcrypt pra dentro do bundle do middleware. O login de verdade
 * (com Credentials + Prisma) só existe em lib/auth.ts, que roda em rota de
 * API/Server Component, não no middleware.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // Só roda no momento do login (quando `user` vem preenchido) — troca de
      // Role/permissão feita depois só vale a partir do próximo login, igual
      // já era pro Role antes disso existir.
      if (user) {
        token.role = user.role;
        token.permissoes = user.permissoes;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      session.user.permissoes = token.permissoes as PermissoesPorModulo | undefined;
      session.user.image = token.picture;
      return session;
    },
  },
} satisfies NextAuthConfig;
