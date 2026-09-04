-- =========================================================
-- GRANT de privilégios de tabela. RLS (policies) controla QUAIS linhas
-- um usuário vê/edita, mas o Postgres ainda exige GRANT pra permitir
-- a operação na tabela em si. Sem isso: "permission denied for table X"
-- mesmo com RLS/policies corretas.
-- Rodar depois de schema.sql, functions e storage_policies.
-- =========================================================

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant execute on function public.corrigir_resposta to authenticated;
