-- Planejamento vira estrutura real da escola (achado real, set/2026: pasta
-- de planejamento da Educação Infantil) — Projeto pedagógico por turma no
-- lugar do TemaPlanejamento (catálogo global da coordenação), e cada dia do
-- planejamento semanal ganha a estrutura real (temática/momentos ou
-- contexto/roda de conversa, com perguntas norteadoras) em vez de 1 texto só.

-- DropForeignKey (Planejamento não referencia mais TemaPlanejamento)
ALTER TABLE "Planejamento" DROP CONSTRAINT "Planejamento_temaId_fkey";

-- AlterTable: Planejamento perde temaId, ganha projetoId + materiais da semana
ALTER TABLE "Planejamento" DROP COLUMN "temaId";
ALTER TABLE "Planejamento" ADD COLUMN "projetoId" TEXT;
ALTER TABLE "Planejamento" ADD COLUMN "materiais" TEXT;

-- DropTable (substituído por ProjetoPedagogico, por turma)
DROP TABLE "TemaPlanejamento";

-- CreateEnum
CREATE TYPE "TipoDiaPlanejamento" AS ENUM ('TEMATICA', 'CONTEXTO');

-- CreateTable
CREATE TABLE "ProjetoPedagogico" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "interessesObservados" TEXT,
    "necessidadesObservadas" TEXT,
    "acoesNarrativasPerguntas" TEXT,
    "intencionalidades" TEXT,
    "justificativa" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoPedagogico_pkey" PRIMARY KEY ("id")
);

-- AlterTable: PlanejamentoDia troca "conteudo" texto por JSON estruturado,
-- ganha "tipo" (TEMATICA/CONTEXTO) e "especializadas". O texto livre que já
-- existisse (não deve haver nenhum real ainda) é preservado dentro do JSON
-- em vez de descartado.
ALTER TABLE "PlanejamentoDia" ADD COLUMN "tipo" "TipoDiaPlanejamento" NOT NULL DEFAULT 'TEMATICA';
ALTER TABLE "PlanejamentoDia" ADD COLUMN "especializadas" TEXT;
ALTER TABLE "PlanejamentoDia" ADD COLUMN "conteudoNovo" JSONB;
UPDATE "PlanejamentoDia" SET "conteudoNovo" = jsonb_build_object('momentoInicial', "conteudo") WHERE "conteudo" IS NOT NULL AND "conteudo" != '';
UPDATE "PlanejamentoDia" SET "conteudoNovo" = '{}'::jsonb WHERE "conteudoNovo" IS NULL;
ALTER TABLE "PlanejamentoDia" ALTER COLUMN "conteudoNovo" SET NOT NULL;
ALTER TABLE "PlanejamentoDia" DROP COLUMN "conteudo";
ALTER TABLE "PlanejamentoDia" RENAME COLUMN "conteudoNovo" TO "conteudo";

-- CreateIndex
CREATE INDEX "ProjetoPedagogico_turmaId_idx" ON "ProjetoPedagogico"("turmaId");

-- CreateIndex
CREATE INDEX "ProjetoPedagogico_turmaId_ativo_idx" ON "ProjetoPedagogico"("turmaId", "ativo");

-- CreateIndex
CREATE INDEX "Planejamento_projetoId_idx" ON "Planejamento"("projetoId");

-- AddForeignKey
ALTER TABLE "ProjetoPedagogico" ADD CONSTRAINT "ProjetoPedagogico_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoPedagogico" ADD CONSTRAINT "ProjetoPedagogico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "ProjetoPedagogico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
