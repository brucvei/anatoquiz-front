-- Corrige perguntas criadas com o formulário antigo, em que a alternativa correta podia
-- não ter nada a ver com a estrutura marcada (ex: estrutura "Aorta", alternativas "1", "2", "3", "4").
-- Regra nova: a resposta correta é sempre o nome da estrutura do marcador (hotspot).
--
-- Para cada pergunta:
--   1) se alguma alternativa já tem o nome da estrutura (sem diferenciar acento/maiúscula),
--      ela passa a ser a única correta;
--   2) senão, o texto da alternativa correta (ou da primeira, se nenhuma estiver marcada)
--      vira o nome da estrutura e as demais ficam erradas.
--
-- Depende da 009 (usa normalizar_nome). Rodar no SQL Editor do Supabase:
--   select * from public.corrigir_perguntas_inconsistentes();       -- só mostra o que MUDARIA
--   select * from public.corrigir_perguntas_inconsistentes(true);   -- aplica
-- Pode rodar de novo: depois de aplicada, não retorna mais nenhuma linha.

create or replace function public.corrigir_perguntas_inconsistentes(p_aplicar boolean default false)
returns table (out_pergunta_id uuid, out_estrutura varchar, out_acao text)
language plpgsql set search_path = public, extensions as $$
declare
    r record;
    v_igual uuid;     -- alternativa que já tem o nome da estrutura
    v_alvo uuid;      -- alternativa que vai receber o nome da estrutura
begin
    for r in
        select pg.id as pid, e.nome as enome
          from pergunta pg
          join hotspot h on h.id = pg.hotspot_id
          join estrutura_anatomica e on e.id = h.estrutura_id
    loop
        select a.id into v_igual
          from alternativa a
         where a.pergunta_id = r.pid
           and public.normalizar_nome(a.texto) = public.normalizar_nome(r.enome)
         order by a.correta desc, a.id
         limit 1;

        if v_igual is not null then
            -- já existe a alternativa certa; só falta ela ser a única marcada
            if exists (select 1 from alternativa a where a.pergunta_id = r.pid and a.correta and a.id <> v_igual)
               or not exists (select 1 from alternativa a where a.id = v_igual and a.correta) then
                out_pergunta_id := r.pid; out_estrutura := r.enome;
                out_acao := 'marcar a alternativa que já tem o nome da estrutura como única correta';
                if p_aplicar then
                    update alternativa a set correta = (a.id = v_igual) where a.pergunta_id = r.pid;
                end if;
                return next;
            end if;
        else
            select a.id into v_alvo
              from alternativa a
             where a.pergunta_id = r.pid
             order by a.correta desc, a.id
             limit 1;

            if v_alvo is null then
                continue;  -- pergunta sem alternativas: nada a corrigir aqui (o autor precisa salvar de novo)
            end if;

            out_pergunta_id := r.pid; out_estrutura := r.enome;
            out_acao := 'trocar o texto da alternativa correta pelo nome da estrutura';
            if p_aplicar then
                update alternativa a set texto = r.enome, correta = true where a.id = v_alvo;
                update alternativa a set correta = false where a.pergunta_id = r.pid and a.id <> v_alvo;
            end if;
            return next;
        end if;
    end loop;
end;
$$;

-- função de manutenção: ninguém além do dono do banco (SQL Editor) deve poder chamar via API
revoke execute on function public.corrigir_perguntas_inconsistentes(boolean) from public, anon, authenticated;
