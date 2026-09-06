-- Modo livre passa a usar fuzzy match de verdade (pg_trgm) em vez de comparação exata.
-- Rodar uma vez no SQL Editor do Supabase.

create extension if not exists "pg_trgm";

create or replace function public.corrigir_resposta(
    p_pergunta_id uuid,
    p_modo varchar,
    p_alternativa_id uuid default null,
    p_resposta_texto varchar default null
)
returns table (
    acertou boolean,
    pontos integer,
    estrutura_correta varchar
) as $$
declare
    v_usuario_id uuid := auth.uid();
    v_quiz_id uuid;
    v_estrutura_nome varchar;
    v_alternativa_correta_id uuid;
    v_acertou boolean := false;
    v_pontos integer := 0;
begin
    if v_usuario_id is null then
        raise exception 'não autenticado';
    end if;

    select q.id, e.nome
      into v_quiz_id, v_estrutura_nome
      from pergunta pg
      join hotspot h on h.id = pg.hotspot_id
      join estrutura_anatomica e on e.id = h.estrutura_id
      join imagem_vista i on i.id = h.imagem_id
      join peca_anatomica p on p.id = i.peca_id
      join quiz q on q.id = p.quiz_id
     where pg.id = p_pergunta_id;

    if v_quiz_id is null then
        raise exception 'pergunta não encontrada';
    end if;

    if p_modo = 'multipla' then
        select a.id into v_alternativa_correta_id
          from alternativa a
         where a.pergunta_id = p_pergunta_id and a.correta = true
         limit 1;

        v_acertou := (p_alternativa_id is not null and p_alternativa_id = v_alternativa_correta_id);
        v_pontos := case when v_acertou then 10 else 0 end;

    elsif p_modo = 'livre' then
        v_acertou := exists (
            select 1
              from alternativa a
             where a.pergunta_id = p_pergunta_id
               and a.correta = true
               and similarity(lower(trim(a.texto)), lower(trim(coalesce(p_resposta_texto, '')))) >= 0.35
        ) or similarity(lower(trim(v_estrutura_nome)), lower(trim(coalesce(p_resposta_texto, '')))) >= 0.35;

        v_pontos := case when v_acertou then 20 else 0 end;
    else
        raise exception 'modo inválido: %', p_modo;
    end if;

    insert into tentativa_resposta (
        usuario_id, quiz_id, pergunta_id, alternativa_id,
        modo, resposta_texto, acertou, pontos
    ) values (
        v_usuario_id, v_quiz_id, p_pergunta_id, p_alternativa_id,
        p_modo, p_resposta_texto, v_acertou, v_pontos
    );

    insert into pontuacao_quiz (usuario_id, quiz_id, pontos_total)
    values (v_usuario_id, v_quiz_id, v_pontos)
    on conflict (usuario_id, quiz_id)
    do update set pontos_total = pontuacao_quiz.pontos_total + excluded.pontos_total,
                  atualizado_em = now();

    return query select v_acertou, v_pontos, v_estrutura_nome;
end;
$$ language plpgsql security definer;
