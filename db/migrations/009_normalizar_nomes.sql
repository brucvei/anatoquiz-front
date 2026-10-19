-- Idioma do quiz (pt-BR / es), usado no filtro "Idioma do quiz" da busca.
-- Rodar uma vez no SQL Editor do Supabase, ANTES de publicar o front que usa a coluna.

alter table quiz add column idioma varchar(5) not null default 'pt-BR'
    check (idioma in ('pt-BR', 'es'));

create index idx_quiz_idioma on quiz(idioma);


-- Unifica termos duplicados em sistema_anatomico e estrutura_anatomica
-- ("Osso", "osso ", "ÓSSEO" viravam registros separados porque a busca era um ilike exato).
-- nome_normalizado = minúsculas, sem acento, sem espaços extras; mantido por trigger.
-- Rodar no SQL Editor do Supabase, ANTES de publicar o front que usa a coluna.
-- Idempotente (pode rodar de novo se der erro no meio) e sem tabela temporária:
-- o SQL Editor pode executar cada comando numa sessão diferente.

create extension if not exists unaccent;

create or replace function public.normalizar_nome(p text)
returns text language sql immutable set search_path = public, extensions as $$
  select lower(regexp_replace(trim(unaccent(p)), '\s+', ' ', 'g'));
$$;

create or replace function public.set_nome_normalizado()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.nome := regexp_replace(trim(new.nome), '\s+', ' ', 'g');
  new.nome_normalizado := public.normalizar_nome(new.nome);
  return new;
end;
$$;

-- ---------- sistema_anatomico ----------
alter table sistema_anatomico add column if not exists nome_normalizado text;
update sistema_anatomico set nome_normalizado = public.normalizar_nome(nome);

-- em cada grupo de duplicados mantém o menor id (dup_id -> keep_id), repassa as referências e apaga o resto
update peca_anatomica p set sistema_id = c.keep_id
  from (select s.id as dup_id, g.keep_id
          from sistema_anatomico s
          join (select nome_normalizado, (array_agg(id order by id::text))[1] as keep_id
                  from sistema_anatomico group by nome_normalizado having count(*) > 1) g
            on g.nome_normalizado = s.nome_normalizado
         where s.id <> g.keep_id) c
 where p.sistema_id = c.dup_id;

update estrutura_anatomica e set sistema_id = c.keep_id
  from (select s.id as dup_id, g.keep_id
          from sistema_anatomico s
          join (select nome_normalizado, (array_agg(id order by id::text))[1] as keep_id
                  from sistema_anatomico group by nome_normalizado having count(*) > 1) g
            on g.nome_normalizado = s.nome_normalizado
         where s.id <> g.keep_id) c
 where e.sistema_id = c.dup_id;

delete from sistema_anatomico s
 using (select nome_normalizado, (array_agg(id order by id::text))[1] as keep_id
          from sistema_anatomico group by nome_normalizado having count(*) > 1) g
 where s.nome_normalizado = g.nome_normalizado and s.id <> g.keep_id;

alter table sistema_anatomico alter column nome_normalizado set not null;
create unique index if not exists uq_sistema_nome_normalizado on sistema_anatomico(nome_normalizado);
drop trigger if exists trg_sistema_nome_normalizado on sistema_anatomico;
create trigger trg_sistema_nome_normalizado before insert or update of nome on sistema_anatomico
  for each row execute function public.set_nome_normalizado();

-- ---------- estrutura_anatomica ----------
alter table estrutura_anatomica add column if not exists nome_normalizado text;
update estrutura_anatomica set nome_normalizado = public.normalizar_nome(nome);

update hotspot h set estrutura_id = c.keep_id
  from (select e.id as dup_id, g.keep_id
          from estrutura_anatomica e
          join (select nome_normalizado, (array_agg(id order by id::text))[1] as keep_id
                  from estrutura_anatomica group by nome_normalizado having count(*) > 1) g
            on g.nome_normalizado = e.nome_normalizado
         where e.id <> g.keep_id) c
 where h.estrutura_id = c.dup_id;

delete from estrutura_anatomica e
 using (select nome_normalizado, (array_agg(id order by id::text))[1] as keep_id
          from estrutura_anatomica group by nome_normalizado having count(*) > 1) g
 where e.nome_normalizado = g.nome_normalizado and e.id <> g.keep_id;

alter table estrutura_anatomica alter column nome_normalizado set not null;
create unique index if not exists uq_estrutura_nome_normalizado on estrutura_anatomica(nome_normalizado);
drop trigger if exists trg_estrutura_nome_normalizado on estrutura_anatomica;
create trigger trg_estrutura_nome_normalizado before insert or update of nome on estrutura_anatomica
  for each row execute function public.set_nome_normalizado();
