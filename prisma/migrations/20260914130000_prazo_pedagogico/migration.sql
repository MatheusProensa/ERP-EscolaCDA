-- Prazo mensal do Planejamento (pedido do dono, set/2026: "coordenadora
-- define o prazo do mês"). 1 registro por mês, vale pra todas as turmas.
CREATE TABLE "PrazoPedagogico" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "dataLimite" TIMESTAMP(3) NOT NULL,
    "definidoPorId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrazoPedagogico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrazoPedagogico_mes_key" ON "PrazoPedagogico"("mes");

ALTER TABLE "PrazoPedagogico" ADD CONSTRAINT "PrazoPedagogico_definidoPorId_fkey" FOREIGN KEY ("definidoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
