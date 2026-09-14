-- Botão "Finalizar" no Planejamento (pedido do dono, set/2026) — status
-- explícito em vez do "Entregue" ser só heurística de "tem algo preenchido".
-- Mesmo padrão já usado em StatusParecer.

-- CreateEnum
CREATE TYPE "StatusPlanejamento" AS ENUM ('RASCUNHO', 'ENVIADO');

-- AlterTable
ALTER TABLE "Planejamento" ADD COLUMN "status" "StatusPlanejamento" NOT NULL DEFAULT 'RASCUNHO';
