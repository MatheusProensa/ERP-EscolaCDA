-- CreateEnum
CREATE TYPE "PapelPedagogico" AS ENUM ('REGENTE', 'ESPECIALISTA');

-- CreateTable
CREATE TABLE "VinculoPedagogico" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "papel" "PapelPedagogico" NOT NULL,
    "materia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VinculoPedagogico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VinculoPedagogico_turmaId_idx" ON "VinculoPedagogico"("turmaId");

-- CreateIndex
CREATE INDEX "VinculoPedagogico_userId_idx" ON "VinculoPedagogico"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VinculoPedagogico_userId_turmaId_materia_key" ON "VinculoPedagogico"("userId", "turmaId", "materia");

-- AddForeignKey
ALTER TABLE "VinculoPedagogico" ADD CONSTRAINT "VinculoPedagogico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoPedagogico" ADD CONSTRAINT "VinculoPedagogico_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
