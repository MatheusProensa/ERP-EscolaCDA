import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Conta temporariamente bloqueada por excesso de tentativas erradas —
        // nega sem nem checar a senha (evita reiniciar a janela de bloqueio).
        if (user.bloqueadoAte && user.bloqueadoAte > new Date()) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          const tentativas = user.tentativasFalhas + 1;
          const LIMITE = 5;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              tentativasFalhas: tentativas,
              // 15min de bloqueio a cada vez que bate o limite — não zera sozinho
              // antes disso, só um login certo reseta o contador.
              bloqueadoAte: tentativas >= LIMITE ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
            },
          });
          return null;
        }

        if (user.tentativasFalhas > 0 || user.bloqueadoAte) {
          await prisma.user.update({ where: { id: user.id }, data: { tentativasFalhas: 0, bloqueadoAte: null } });
        }

        const permissoesSalvas = await prisma.permissaoUsuario.findMany({ where: { userId: user.id } });
        const permissoes = Object.fromEntries(permissoesSalvas.map((p) => [p.modulo, p.nivel]));

        // Não devolve a foto aqui (image: user.foto) — ela é base64 e ia parar no
        // cookie de sessão (ver lib/auth.config.ts pro motivo completo). Foto de
        // cada um é buscada fresca do banco onde precisa aparecer.
        return { id: user.id, name: user.name, email: user.email, role: user.role, permissoes };
      },
    }),
  ],
});
