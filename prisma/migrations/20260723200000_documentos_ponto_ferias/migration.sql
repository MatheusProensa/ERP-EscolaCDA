-- AlterEnum
ALTER TYPE "Turno" ADD VALUE 'INTEGRAL';

-- CreateEnum
CREATE TYPE "DocumentoCategoria" AS ENUM ('LEGALIZACAO', 'FINANCEIRO', 'RH', 'CONTRATOS', 'INSTITUCIONAL');

-- CreateEnum
CREATE TYPE "PontoOcorrencia" AS ENUM ('NORMAL', 'FALTA', 'FERIADO', 'FERIAS', 'ATESTADO', 'FOLGA', 'DSR');

-- AlterTable
ALTER TABLE "Funcionario" ALTER COLUMN "cpf" DROP NOT NULL;
ALTER TABLE "Funcionario" ADD COLUMN "empresa" TEXT;
ALTER TABLE "Funcionario" ADD COLUMN "valeTransporte" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" "DocumentoCategoria" NOT NULL,
    "subcategoria" TEXT,
    "arquivoUrl" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'Google Drive',
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroPonto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "entrada1" TEXT,
    "saida1" TEXT,
    "entrada2" TEXT,
    "saida2" TEXT,
    "entrada3" TEXT,
    "saida3" TEXT,
    "minutosPrevistos" INTEGER NOT NULL DEFAULT 0,
    "minutosTrabalhados" INTEGER NOT NULL DEFAULT 0,
    "ocorrencia" "PontoOcorrencia" NOT NULL DEFAULT 'NORMAL',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroPonto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ferias" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "dias" INTEGER NOT NULL,
    "tipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ferias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroPonto_funcionarioId_data_key" ON "RegistroPonto"("funcionarioId", "data");

-- AddForeignKey
ALTER TABLE "RegistroPonto" ADD CONSTRAINT "RegistroPonto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ferias" ADD CONSTRAINT "Ferias_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
