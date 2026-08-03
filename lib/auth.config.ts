import type { NextAuthConfig } from "next-auth";

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
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
