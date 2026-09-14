-- Comentário da coordenadora ao aprovar/devolver + confirmação de leitura da
-- regente ("li e entendi"). Roda DEPOIS da migration anterior (enum novo).
ALTER TABLE "Planejamento" ADD COLUMN "comentarioCoordenadora" TEXT;
ALTER TABLE "Planejamento" ADD COLUMN "comentarioAutorId" TEXT;
ALTER TABLE "Planejamento" ADD COLUMN "comentarioEm" TIMESTAMP(3);
ALTER TABLE "Planejamento" ADD COLUMN "liComentarioEm" TIMESTAMP(3);
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_comentarioAutorId_fkey" FOREIGN KEY ("comentarioAutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
