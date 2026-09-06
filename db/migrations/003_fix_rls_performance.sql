-- =========================================================
-- Corrige performance de RLS: "canceling statement due to statement timeout"
-- em pergunta/alternativa (e qualquer coisa que atravesse hotspot->imagem_vista
-- ->peca_anatomica->quiz). Causa: auth.uid() sem "select" + EXISTS aninhado
-- disparando RLS de novo em cada tabela do join (RLS dentro de RLS).
-- Fix: funções security definer fazem os lookups sem re-acionar RLS, e
-- auth.uid()/auth.role() envolvidos em (select ...) pro Postgres cachear.
-- Rodar uma vez no SQL Editor do Supabase.
-- =========================================================

create index if not exists idx_imagem_peca on imagem_vista(peca_id);

create or replace function public.quiz_dono(p_quiz_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from quiz where id = p_quiz_id and autor_id = (select auth.uid()));
$$;

create or replace function public.quiz_visivel(p_quiz_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from quiz where id = p_quiz_id and (publico = true or autor_id = (select auth.uid())));
$$;

create or replace function public.peca_quiz_id(p_peca_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select quiz_id from peca_anatomica where id = p_peca_id;
$$;

create or replace function public.imagem_quiz_id(p_imagem_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.peca_quiz_id(peca_id) from imagem_vista where id = p_imagem_id;
$$;

create or replace function public.hotspot_quiz_id(p_hotspot_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.imagem_quiz_id(imagem_id) from hotspot where id = p_hotspot_id;
$$;

create or replace function public.pergunta_quiz_id(p_pergunta_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.hotspot_quiz_id(hotspot_id) from pergunta where id = p_pergunta_id;
$$;

-- PERFIL
drop policy if exists "perfil_select_all" on perfil;
drop policy if exists "perfil_update_own" on perfil;
create policy "perfil_select_all" on perfil for select using ((select auth.role()) = 'authenticated');
create policy "perfil_update_own" on perfil for update using ((select auth.uid()) = id);

-- QUIZ
drop policy if exists "quiz_select_public" on quiz;
drop policy if exists "quiz_insert_own" on quiz;
drop policy if exists "quiz_update_own" on quiz;
drop policy if exists "quiz_delete_own" on quiz;
create policy "quiz_select_public" on quiz for select using (publico = true or autor_id = (select auth.uid()));
create policy "quiz_insert_own" on quiz for insert with check (autor_id = (select auth.uid()));
create policy "quiz_update_own" on quiz for update using (autor_id = (select auth.uid()));
create policy "quiz_delete_own" on quiz for delete using (autor_id = (select auth.uid()));

-- SISTEMA_ANATOMICO / ESTRUTURA_ANATOMICA
drop policy if exists "sistema_select_all" on sistema_anatomico;
drop policy if exists "sistema_insert_auth" on sistema_anatomico;
create policy "sistema_select_all" on sistema_anatomico for select using ((select auth.role()) = 'authenticated');
create policy "sistema_insert_auth" on sistema_anatomico for insert with check ((select auth.role()) = 'authenticated');

drop policy if exists "estrutura_select_all" on estrutura_anatomica;
drop policy if exists "estrutura_insert_auth" on estrutura_anatomica;
create policy "estrutura_select_all" on estrutura_anatomica for select using ((select auth.role()) = 'authenticated');
create policy "estrutura_insert_auth" on estrutura_anatomica for insert with check ((select auth.role()) = 'authenticated');

-- PECA_ANATOMICA
drop policy if exists "peca_select_via_quiz" on peca_anatomica;
drop policy if exists "peca_write_own_quiz" on peca_anatomica;
create policy "peca_select_via_quiz" on peca_anatomica for select using (quiz_visivel(quiz_id));
create policy "peca_write_own_quiz" on peca_anatomica for all using (quiz_dono(quiz_id));

-- IMAGEM_VISTA
drop policy if exists "imagem_select_via_quiz" on imagem_vista;
drop policy if exists "imagem_write_own_quiz" on imagem_vista;
create policy "imagem_select_via_quiz" on imagem_vista for select using (quiz_visivel(peca_quiz_id(peca_id)));
create policy "imagem_write_own_quiz" on imagem_vista for all using (quiz_dono(peca_quiz_id(peca_id)));

-- HOTSPOT
drop policy if exists "hotspot_select_via_quiz" on hotspot;
drop policy if exists "hotspot_write_own_quiz" on hotspot;
create policy "hotspot_select_via_quiz" on hotspot for select using (quiz_visivel(imagem_quiz_id(imagem_id)));
create policy "hotspot_write_own_quiz" on hotspot for all using (quiz_dono(imagem_quiz_id(imagem_id)));

-- PERGUNTA
drop policy if exists "pergunta_select_via_quiz" on pergunta;
drop policy if exists "pergunta_write_own_quiz" on pergunta;
create policy "pergunta_select_via_quiz" on pergunta for select using (quiz_visivel(hotspot_quiz_id(hotspot_id)));
create policy "pergunta_write_own_quiz" on pergunta for all using (quiz_dono(hotspot_quiz_id(hotspot_id)));

-- ALTERNATIVA
drop policy if exists "alternativa_select_via_quiz" on alternativa;
drop policy if exists "alternativa_write_own_quiz" on alternativa;
create policy "alternativa_select_via_quiz" on alternativa for select using (quiz_visivel(pergunta_quiz_id(pergunta_id)));
create policy "alternativa_write_own_quiz" on alternativa for all using (quiz_dono(pergunta_quiz_id(pergunta_id)));

-- TENTATIVA_RESPOSTA / PONTUACAO_QUIZ
drop policy if exists "tentativa_select_own" on tentativa_resposta;
drop policy if exists "tentativa_insert_own" on tentativa_resposta;
create policy "tentativa_select_own" on tentativa_resposta for select using ((select auth.uid()) = usuario_id);
create policy "tentativa_insert_own" on tentativa_resposta for insert with check ((select auth.uid()) = usuario_id);

drop policy if exists "pontuacao_select_own" on pontuacao_quiz;
drop policy if exists "pontuacao_insert_own" on pontuacao_quiz;
drop policy if exists "pontuacao_update_own" on pontuacao_quiz;
create policy "pontuacao_select_own" on pontuacao_quiz for select using ((select auth.uid()) = usuario_id);
create policy "pontuacao_insert_own" on pontuacao_quiz for insert with check ((select auth.uid()) = usuario_id);
create policy "pontuacao_update_own" on pontuacao_quiz for update using ((select auth.uid()) = usuario_id);

-- STORAGE (bucket pecas-anatomicas)
drop policy if exists "pecas_select_via_quiz" on storage.objects;
drop policy if exists "pecas_insert_own_quiz" on storage.objects;
drop policy if exists "pecas_update_own_quiz" on storage.objects;
drop policy if exists "pecas_delete_own_quiz" on storage.objects;

create policy "pecas_select_via_quiz" on storage.objects for select using (
    bucket_id = 'pecas-anatomicas' and quiz_visivel((storage.foldername(name))[1]::uuid)
);
create policy "pecas_insert_own_quiz" on storage.objects for insert with check (
    bucket_id = 'pecas-anatomicas' and quiz_dono((storage.foldername(name))[1]::uuid)
);
create policy "pecas_update_own_quiz" on storage.objects for update using (
    bucket_id = 'pecas-anatomicas' and quiz_dono((storage.foldername(name))[1]::uuid)
);
create policy "pecas_delete_own_quiz" on storage.objects for delete using (
    bucket_id = 'pecas-anatomicas' and quiz_dono((storage.foldername(name))[1]::uuid)
);

-- funções precisam de EXECUTE pros roles que as chamam via policy
grant execute on function public.quiz_dono, public.quiz_visivel, public.peca_quiz_id,
  public.imagem_quiz_id, public.hotspot_quiz_id, public.pergunta_quiz_id
  to authenticated, anon;
