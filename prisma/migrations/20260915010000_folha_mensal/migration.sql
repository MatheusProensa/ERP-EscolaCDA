CREATE TYPE "TipoFolhaMensal" AS ENUM ('ATIVIDADE_GRAFICA', 'TEMA_LITERARIO');

CREATE TABLE "FolhaMensal" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "tipo" "TipoFolhaMensal" NOT NULL,
    "semanaInicio" TIMESTAMP(3) NOT NULL,
    "status" "StatusPlanejamento" NOT NULL DEFAULT 'RASCUNHO',
    "comentarioCoordenadora" TEXT,
    "comentarioAutorId" TEXT,
    "comentarioEm" TIMESTAMP(3),
    "liComentarioEm" TIMESTAMP(3),
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FolhaMensal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FolhaMensal_turmaId_tipo_semanaInicio_key" ON "FolhaMensal"("turmaId", "tipo", "semanaInicio");

CREATE INDEX "FolhaMensal_turmaId_idx" ON "FolhaMensal"("turmaId");

ALTER TABLE "FolhaMensal" ADD CONSTRAINT "FolhaMensal_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FolhaMensal" ADD CONSTRAINT "FolhaMensal_comentarioAutorId_fkey" FOREIGN KEY ("comentarioAutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FolhaMensal" ADD CONSTRAINT "FolhaMensal_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
