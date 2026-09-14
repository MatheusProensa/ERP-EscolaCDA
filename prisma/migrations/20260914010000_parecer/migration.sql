-- CreateEnum
CREATE TYPE "StatusParecer" AS ENUM ('RASCUNHO', 'ENVIADO');

-- CreateTable
CREATE TABLE "ModeloParecer" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeloParecer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParagrafoModeloParecer" (
    "id" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "perguntaNorteadora" TEXT,

    CONSTRAINT "ParagrafoModeloParecer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parecer" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "textoTurma" TEXT,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parecer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParecerAluno" (
    "id" TEXT NOT NULL,
    "parecerId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "status" "StatusParecer" NOT NULL DEFAULT 'RASCUNHO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParecerAluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParecerAlunoParagrafo" (
    "id" TEXT NOT NULL,
    "parecerAlunoId" TEXT NOT NULL,
    "paragrafoId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,

    CONSTRAINT "ParecerAlunoParagrafo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParagrafoModeloParecer_modeloId_ordem_key" ON "ParagrafoModeloParecer"("modeloId", "ordem");

-- CreateIndex
CREATE INDEX "Parecer_modeloId_idx" ON "Parecer"("modeloId");

-- CreateIndex
CREATE UNIQUE INDEX "Parecer_turmaId_periodo_key" ON "Parecer"("turmaId", "periodo");

-- CreateIndex
CREATE INDEX "ParecerAluno_alunoId_idx" ON "ParecerAluno"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "ParecerAluno_parecerId_alunoId_key" ON "ParecerAluno"("parecerId", "alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "ParecerAlunoParagrafo_parecerAlunoId_paragrafoId_key" ON "ParecerAlunoParagrafo"("parecerAlunoId", "paragrafoId");

-- AddForeignKey
ALTER TABLE "ModeloParecer" ADD CONSTRAINT "ModeloParecer_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagrafoModeloParecer" ADD CONSTRAINT "ParagrafoModeloParecer_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloParecer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parecer" ADD CONSTRAINT "Parecer_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parecer" ADD CONSTRAINT "Parecer_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloParecer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parecer" ADD CONSTRAINT "Parecer_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParecerAluno" ADD CONSTRAINT "ParecerAluno_parecerId_fkey" FOREIGN KEY ("parecerId") REFERENCES "Parecer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParecerAluno" ADD CONSTRAINT "ParecerAluno_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParecerAlunoParagrafo" ADD CONSTRAINT "ParecerAlunoParagrafo_parecerAlunoId_fkey" FOREIGN KEY ("parecerAlunoId") REFERENCES "ParecerAluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParecerAlunoParagrafo" ADD CONSTRAINT "ParecerAlunoParagrafo_paragrafoId_fkey" FOREIGN KEY ("paragrafoId") REFERENCES "ParagrafoModeloParecer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
