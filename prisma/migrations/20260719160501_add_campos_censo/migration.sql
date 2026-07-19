-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aluno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nomeSocial" TEXT,
    "dataNascimento" DATETIME NOT NULL,
    "naturalidade" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "certidaoNascimento" TEXT,
    "foto" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "cep" TEXT,
    "tipoSanguineo" TEXT,
    "convenioMedico" TEXT,
    "medicacaoContinua" TEXT,
    "alergias" TEXT,
    "restricoes" TEXT,
    "necessidadesEsp" TEXT,
    "autorizacaoImagem" BOOLEAN NOT NULL DEFAULT false,
    "sexo" TEXT,
    "racaCor" TEXT,
    "povoIndigena" TEXT,
    "nacionalidade" TEXT NOT NULL DEFAULT 'BRASILEIRA',
    "municipioNasc" TEXT,
    "ufNasc" TEXT,
    "filiacao1" TEXT,
    "filiacao2" TEXT,
    "bolsaFamilia" BOOLEAN NOT NULL DEFAULT false,
    "deficiencia" BOOLEAN NOT NULL DEFAULT false,
    "tipoDeficiencia" TEXT,
    "recursosAcessib" TEXT,
    "nis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Aluno" ("alergias", "autorizacaoImagem", "bairro", "cep", "certidaoNascimento", "cidade", "convenioMedico", "cpf", "createdAt", "dataNascimento", "endereco", "foto", "id", "medicacaoContinua", "naturalidade", "necessidadesEsp", "nome", "restricoes", "rg", "tipoSanguineo", "updatedAt") SELECT "alergias", "autorizacaoImagem", "bairro", "cep", "certidaoNascimento", "cidade", "convenioMedico", "cpf", "createdAt", "dataNascimento", "endereco", "foto", "id", "medicacaoContinua", "naturalidade", "necessidadesEsp", "nome", "restricoes", "rg", "tipoSanguineo", "updatedAt" FROM "Aluno";
DROP TABLE "Aluno";
ALTER TABLE "new_Aluno" RENAME TO "Aluno";
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
