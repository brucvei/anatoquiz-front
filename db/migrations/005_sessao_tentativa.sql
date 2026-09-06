-- =========================================================
-- Adiciona sessao_id em tentativa_resposta: agrupa as respostas de
-- uma mesma partida, pra tela de resultado separar "essa jogada" das
-- tentativas anteriores. Rodar depois de atualizar corrigir_resposta.sql.
-- =========================================================

alter table tentativa_resposta add column if not exists sessao_id uuid;
create index if not exists idx_tentativa_sessao on tentativa_resposta(sessao_id);
x'x