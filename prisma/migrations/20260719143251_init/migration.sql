-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SECRETARIA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnoLetivo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ano" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 30,
    "anoLetivoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turma_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATETIME NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "foto" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "cep" TEXT,
    "alergias" TEXT,
    "restricoes" TEXT,
    "necessidadesEsp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "autorizado" BOOLEAN NOT NULL DEFAULT true,
    "alunoId" TEXT NOT NULL,
    CONSTRAINT "Responsavel_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "anoLetivoId" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'ATIVA',
    "dataMatricula" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Matricula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Matricula_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mensalidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matriculaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mensalidade_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mensalidadeId" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "dataPagamento" DATETIME NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_mensalidadeId_fkey" FOREIGN KEY ("mensalidadeId") REFERENCES "Mensalidade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matriculaId" TEXT NOT NULL,
    "arquivo" TEXT,
    "assinado" BOOLEAN NOT NULL DEFAULT false,
    "dataEnvio" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contrato_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "admissao" DATETIME NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ItemEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "minimo" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentacaoEstoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemEstoque" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cardapio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "almoco" TEXT NOT NULL,
    "lanche" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Chave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sala" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "EmprestimoChave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chaveId" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "retirada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devolucao" DATETIME,
    CONSTRAINT "EmprestimoChave_chaveId_fkey" FOREIGN KEY ("chaveId") REFERENCES "Chave" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reuniao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "local" TEXT,
    "pauta" TEXT,
    "ata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MuralAviso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LogAtividade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AnoLetivo_ano_key" ON "AnoLetivo"("ano");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_matriculaId_key" ON "Contrato"("matriculaId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_cpf_key" ON "Funcionario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Cardapio_data_key" ON "Cardapio"("data");
