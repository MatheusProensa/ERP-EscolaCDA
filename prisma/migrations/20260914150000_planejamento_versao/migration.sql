-- Versionamento do Planejamento (pedido do dono, set/2026: "o sistema guarda
-- v1 e v2, nunca substitui sem rastro"). 1 versão por envio/reenvio,
-- congela o conteúdo inteiro daquele momento.
CREATE TABLE "PlanejamentoVersao" (
    "id" TEXT NOT NULL,
    "planejamentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "conteudo" JSONB NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "veredito" TEXT,
    "comentario" TEXT,
    "decididoPorId" TEXT,
    "decididoEm" TIMESTAMP(3),

    CONSTRAINT "PlanejamentoVersao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanejamentoVersao_planejamentoId_numero_key" ON "PlanejamentoVersao"("planejamentoId", "numero");
CREATE INDEX "PlanejamentoVersao_planejamentoId_idx" ON "PlanejamentoVersao"("planejamentoId");

ALTER TABLE "PlanejamentoVersao" ADD CONSTRAINT "PlanejamentoVersao_planejamentoId_fkey" FOREIGN KEY ("planejamentoId") REFERENCES "Planejamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanejamentoVersao" ADD CONSTRAINT "PlanejamentoVersao_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanejamentoVersao" ADD CONSTRAINT "PlanejamentoVersao_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
