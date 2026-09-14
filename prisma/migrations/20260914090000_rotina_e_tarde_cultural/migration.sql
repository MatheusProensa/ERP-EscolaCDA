-- Achados reais no documento MODELO_PLANEJAMENTO_CDA (releitura completa,
-- set/2026): 2 pedaços que tinham ficado de fora.

-- CreateTable: Planejamento do Cotidiano (rotina fixa da turma — Chegada,
-- Lanche, Pracinha, Soninho etc.), não muda toda semana.
CREATE TABLE "MomentoRotina" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "MomentoRotina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MomentoRotina_turmaId_ordem_idx" ON "MomentoRotina"("turmaId", "ordem");

-- AddForeignKey
ALTER TABLE "MomentoRotina" ADD CONSTRAINT "MomentoRotina_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: nota condicional de Tarde Cultural, por semana
ALTER TABLE "Planejamento" ADD COLUMN "observacaoTardeCultural" TEXT;
