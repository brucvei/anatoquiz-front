-- =========================================================
-- RLS para o bucket de Storage "pecas-anatomicas" (privado).
-- Convenção obrigatória de path: "<quiz_id>/<peca_id>/<angulo>.<ext>"
-- O primeiro segmento do path precisa ser o quiz_id — é isso que
-- permite a policy achar o dono/visibilidade sem tabela extra.
-- Rodar depois de criar o bucket manualmente no painel (Storage > New bucket).
-- =========================================================

create policy "pecas_select_via_quiz"
on storage.objects for select
using (
    bucket_id = 'pecas-anatomicas'
    and exists (
        select 1 from quiz q
        where q.id = (storage.foldername(name))[1]::uuid
          and (q.publico = true or q.autor_id = auth.uid())
    )
);

create policy "pecas_insert_own_quiz"
on storage.objects for insert
with check (
    bucket_id = 'pecas-anatomicas'
    and exists (
        select 1 from quiz q
        where q.id = (storage.foldername(name))[1]::uuid
          and q.autor_id = auth.uid()
    )
);

create policy "pecas_update_own_quiz"
on storage.objects for update
using (
    bucket_id = 'pecas-anatomicas'
    and exists (
        select 1 from quiz q
        where q.id = (storage.foldername(name))[1]::uuid
          and q.autor_id = auth.uid()
    )
);

create policy "pecas_delete_own_quiz"
on storage.objects for delete
using (
    bucket_id = 'pecas-anatomicas'
    and exists (
        select 1 from quiz q
        where q.id = (storage.foldername(name))[1]::uuid
          and q.autor_id = auth.uid()
    )
);
