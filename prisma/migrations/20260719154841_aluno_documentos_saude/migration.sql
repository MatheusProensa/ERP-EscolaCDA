-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aluno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Aluno" ("alergias", "bairro", "cep", "cidade", "cpf", "createdAt", "dataNascimento", "endereco", "foto", "id", "necessidadesEsp", "nome", "restricoes", "rg", "updatedAt") SELECT "alergias", "bairro", "cep", "cidade", "cpf", "createdAt", "dataNascimento", "endereco", "foto", "id", "necessidadesEsp", "nome", "restricoes", "rg", "updatedAt" FROM "Aluno";
DROP TABLE "Aluno";
ALTER TABLE "new_Aluno" RENAME TO "Aluno";
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
