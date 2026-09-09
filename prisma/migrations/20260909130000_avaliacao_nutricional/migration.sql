
-- CreateTable
CREATE TABLE "AvaliacaoNutricional" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "alturaCm" DOUBLE PRECISION NOT NULL,
    "observacoes" TEXT,
    "usuario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoNutricional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvaliacaoNutricional_alunoId_idx" ON "AvaliacaoNutricional"("alunoId");

-- AddForeignKey
ALTER TABLE "AvaliacaoNutricional" ADD CONSTRAINT "AvaliacaoNutricional_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

