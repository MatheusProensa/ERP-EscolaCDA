-- ModeloParecer deixa de ser catálogo global da coordenação e passa a ser
-- por turma (correção do dono, set/2026: "do parecer tbm, deveria ser em
-- cada turma"). Coluna nullable de propósito: nenhum modelo real foi
-- cadastrado ainda (feature lançada nesse mesmo dia), então não há o que
-- migrar — se algum modelo global já tiver sido criado, ele só fica "orfão"
-- (sem aparecer em nenhuma turma) até ser recriado direto na turma certa.
ALTER TABLE "ModeloParecer" ADD COLUMN "turmaId" TEXT;

-- AddForeignKey
ALTER TABLE "ModeloParecer" ADD CONSTRAINT "ModeloParecer_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ModeloParecer_turmaId_idx" ON "ModeloParecer"("turmaId");
