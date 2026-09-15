-- AlterTable
ALTER TABLE "Planejamento" ADD COLUMN     "impresso" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "impressoEm" TIMESTAMP(3),
ADD COLUMN     "impressoPor" TEXT,
ADD COLUMN     "roteiroImpresso" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roteiroImpressoEm" TIMESTAMP(3),
ADD COLUMN     "roteiroImpressoPor" TEXT;

-- AlterTable
ALTER TABLE "FolhaMensal" ADD COLUMN     "impresso" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "impressoEm" TIMESTAMP(3),
ADD COLUMN     "impressoPor" TEXT;

-- CreateTable
CREATE TABLE "ObservacaoImpressao" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "anoMes" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservacaoImpressao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObservacaoImpressao_turmaId_anoMes_key" ON "ObservacaoImpressao"("turmaId", "anoMes");

-- AddForeignKey
ALTER TABLE "ObservacaoImpressao" ADD CONSTRAINT "ObservacaoImpressao_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
