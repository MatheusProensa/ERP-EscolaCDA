-- CreateTable
CREATE TABLE "TemaPlanejamento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estrutura" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemaPlanejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planejamento" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "temaId" TEXT,
    "semanaInicio" TIMESTAMP(3) NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanejamentoDia" (
    "id" TEXT NOT NULL,
    "planejamentoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "conteudo" TEXT NOT NULL,

    CONSTRAINT "PlanejamentoDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Planejamento_turmaId_idx" ON "Planejamento"("turmaId");

-- CreateIndex
CREATE INDEX "Planejamento_temaId_idx" ON "Planejamento"("temaId");

-- CreateIndex
CREATE UNIQUE INDEX "Planejamento_turmaId_semanaInicio_key" ON "Planejamento"("turmaId", "semanaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "PlanejamentoDia_planejamentoId_data_key" ON "PlanejamentoDia"("planejamentoId", "data");

-- AddForeignKey
ALTER TABLE "TemaPlanejamento" ADD CONSTRAINT "TemaPlanejamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "TemaPlanejamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanejamentoDia" ADD CONSTRAINT "PlanejamentoDia_planejamentoId_fkey" FOREIGN KEY ("planejamentoId") REFERENCES "Planejamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
