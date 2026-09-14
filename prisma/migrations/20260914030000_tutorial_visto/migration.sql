-- CreateTable
CREATE TABLE "TutorialVisto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "vistoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialVisto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorialVisto_userId_modulo_key" ON "TutorialVisto"("userId", "modulo");

-- AddForeignKey
ALTER TABLE "TutorialVisto" ADD CONSTRAINT "TutorialVisto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
