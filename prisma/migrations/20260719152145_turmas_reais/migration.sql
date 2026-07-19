/*
  Warnings:

  - You are about to drop the column `serie` on the `Turma` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Turma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 25,
    "anoLetivoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turma_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Turma" ("anoLetivoId", "capacidade", "createdAt", "id", "nome", "turno") SELECT "anoLetivoId", "capacidade", "createdAt", "id", "nome", "turno" FROM "Turma";
DROP TABLE "Turma";
ALTER TABLE "new_Turma" RENAME TO "Turma";
CREATE UNIQUE INDEX "Turma_nome_anoLetivoId_key" ON "Turma"("nome", "anoLetivoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
