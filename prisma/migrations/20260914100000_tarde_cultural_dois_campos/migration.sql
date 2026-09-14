-- Correção: Tarde Cultural tinha virado 1 campo livre, mas o documento real
-- (MODELO_PLANEJAMENTO_CDA) tem 2 partes separadas — apresentação da turma e
-- lista de materiais. Coluna anterior acabou de ser criada e ainda está
-- vazia em produção, então é seguro trocar direto (sem dado a migrar).
ALTER TABLE "Planejamento" DROP COLUMN "observacaoTardeCultural";
ALTER TABLE "Planejamento" ADD COLUMN "tardeCulturalApresentacao" TEXT;
ALTER TABLE "Planejamento" ADD COLUMN "tardeCulturalMateriais" TEXT;
