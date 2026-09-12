-- CreateEnum
CREATE TYPE "StatusFestaFamilia" AS ENUM ('SEM_RESPOSTA', 'CONFIRMADO_AGENDA', 'CONFIRMADO_FORMS', 'NAO_DEU_RETORNO', 'NAO_IRAO', 'VAO_SE_MUDAR');

-- CreateTable
CREATE TABLE "EventoFamilia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "anoLetivoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoFamilia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmacaoFestaFamilia" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "status" "StatusFestaFamilia" NOT NULL DEFAULT 'SEM_RESPOSTA',
    "adultos" INTEGER,
    "criancas" INTEGER,
    "horario" TEXT,
    "compareceu" BOOLEAN,
    "observacao" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmacaoFestaFamilia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoFamilia_anoLetivoId_idx" ON "EventoFamilia"("anoLetivoId");

-- CreateIndex
CREATE INDEX "ConfirmacaoFestaFamilia_eventoId_idx" ON "ConfirmacaoFestaFamilia"("eventoId");

-- CreateIndex
CREATE INDEX "ConfirmacaoFestaFamilia_alunoId_idx" ON "ConfirmacaoFestaFamilia"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmacaoFestaFamilia_eventoId_alunoId_key" ON "ConfirmacaoFestaFamilia"("eventoId", "alunoId");

-- AddForeignKey
ALTER TABLE "EventoFamilia" ADD CONSTRAINT "EventoFamilia_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmacaoFestaFamilia" ADD CONSTRAINT "ConfirmacaoFestaFamilia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoFamilia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmacaoFestaFamilia" ADD CONSTRAINT "ConfirmacaoFestaFamilia_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

