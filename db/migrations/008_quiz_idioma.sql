-- Idioma do quiz (pt-BR / es), usado no filtro "Idioma do quiz" da busca.
-- Rodar uma vez no SQL Editor do Supabase, ANTES de publicar o front que usa a coluna.

alter table quiz add column idioma varchar(5) not null default 'pt-BR'
    check (idioma in ('pt-BR', 'es'));

create index idx_quiz_idioma on quiz(idioma);
