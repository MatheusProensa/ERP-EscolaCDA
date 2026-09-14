-- Prazo do Planejamento vira evento no Calendário geral da escola (pedido
-- do dono, set/2026: "integração com o Calendário — prazo de entrega vira
-- automaticamente um evento"). Guarda o id do evento pra atualizar o mesmo
-- em vez de duplicar quando a data muda.
ALTER TABLE "PrazoPedagogico" ADD COLUMN "eventoCalendarioId" TEXT;
CREATE UNIQUE INDEX "PrazoPedagogico_eventoCalendarioId_key" ON "PrazoPedagogico"("eventoCalendarioId");
