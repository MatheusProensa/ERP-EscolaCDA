-- CreateTable
CREATE TABLE "Disciplina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matriculaId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Nota_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Nota_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nome_key" ON "Disciplina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Nota_matriculaId_disciplinaId_periodo_key" ON "Nota"("matriculaId", "disciplinaId", "periodo");
