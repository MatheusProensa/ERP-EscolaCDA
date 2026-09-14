-- Horário fixo das aulas especializadas por turma (achado real, set/2026: o
-- horário se repete igual toda semana no documento real da escola) — a
-- regente preenche 1 vez, o planejamento semanal usa como padrão em vez de
-- digitar de novo toda semana.

-- CreateTable
CREATE TABLE "HorarioEspecializada" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "HorarioEspecializada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioEspecializada_turmaId_diaSemana_key" ON "HorarioEspecializada"("turmaId", "diaSemana");

-- AddForeignKey
ALTER TABLE "HorarioEspecializada" ADD CONSTRAINT "HorarioEspecializada_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
