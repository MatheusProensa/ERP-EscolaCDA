import type { DefaultSession } from "next-auth";
import type { PermissoesPorModulo } from "@/lib/permissoes";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      permissoes?: PermissoesPorModulo;
      /// Marca a coordenadora pedagógica (vê todas as turmas, cadastra temas
      /// de planejamento, comenta/aprova entregas) — embutido na sessão igual
      /// role/permissoes, só vale a partir do próximo login após mudar.
      coordenaAreaPedagogica?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    permissoes?: PermissoesPorModulo;
    coordenaAreaPedagogica?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    permissoes?: PermissoesPorModulo;
    coordenaAreaPedagogica?: boolean;
  }
}
