-- Fluxo de aprovação do Planejamento (pedido do dono, set/2026): ENVIADO vira
-- APROVADO ou DEVOLVIDO quando a coordenadora revisa. ADD VALUE tem que ser a
-- ÚNICA coisa nesse arquivo (regra do Postgres pra enum).
ALTER TYPE "StatusPlanejamento" ADD VALUE 'APROVADO';
ALTER TYPE "StatusPlanejamento" ADD VALUE 'DEVOLVIDO';
