#!/usr/bin/env node
// Aplica migrations pendentes no banco (se DATABASE_URL já estiver configurada)
// antes de buildar. Sem DATABASE_URL, só builda — não trava o deploy enquanto
// o banco de produção ainda não foi criado.
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL encontrada — aplicando migrations pendentes...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("DATABASE_URL não configurada — pulando migrations, seguindo com o build.");
}

execSync("next build", { stdio: "inherit" });
