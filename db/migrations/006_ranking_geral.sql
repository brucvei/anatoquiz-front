-- Ranking geral: pontuacao_quiz passa a ser visível por qualquer autenticado (só pontos, sem dado sensível).

drop policy if exists "pontuacao_select_own" on pontuacao_quiz;
create policy "pontuacao_select_all" on pontuacao_quiz for select using ((select auth.role()) = 'authenticated');
