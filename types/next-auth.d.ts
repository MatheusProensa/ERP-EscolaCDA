import type { DefaultSession } from "next-auth";
import type { PermissoesPorModulo } from "@/lib/permissoes";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      permissoes?: PermissoesPorModulo;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    permissoes?: PermissoesPorModulo;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    permissoes?: PermissoesPorModulo;
  }
}
