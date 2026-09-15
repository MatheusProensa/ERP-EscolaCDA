ALTER TABLE "DocumentoInstitucional" ALTER COLUMN "link" DROP NOT NULL;

ALTER TABLE "DocumentoInstitucional" ADD COLUMN "arquivo" TEXT;

ALTER TABLE "DocumentoInstitucional" ADD COLUMN "nomeArquivo" TEXT;
