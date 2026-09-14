-- Cargo "Nutrição" separado de ADMINISTRATIVO (pedido do dono, set/2026).
-- ALTER TYPE ... ADD VALUE precisa ser a única coisa rodada nesse "comando"
-- no Postgres (não pode estar dentro de bloco com outras alterações na mesma
-- transação) — por isso essa migration só tem essa 1 linha.
ALTER TYPE "Role" ADD VALUE 'NUTRICAO';
