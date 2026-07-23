-- CreateTable
CREATE TABLE "ControleMaterial" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "itensFaltantes" TEXT,
    "trouxe" BOOLEAN NOT NULL DEFAULT false,
    "prazoReenvio" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControleMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ControleMaterial_matriculaId_key" ON "ControleMaterial"("matriculaId");

-- AddForeignKey
ALTER TABLE "ControleMaterial" ADD CONSTRAINT "ControleMaterial_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
