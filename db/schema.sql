-- =========================================================
-- AnatoQuiz - Quiz Interativo de Anatomia Veterinária
-- Versão "todo mundo cria e joga" (sem papel de professor)
-- Supabase / PostgreSQL
-- =========================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";  -- fuzzy match simples no modo livre (RPC corrigir_resposta)

-- =========================================================
-- 1. PERFIL (estende auth.users do Supabase)
-- =========================================================
create table perfil (
    id              uuid primary key references auth.users(id) on delete cascade,
    nome            varchar(150) not null,
    instituicao     varchar(100),           -- ex: UFSM, USTO
    criado_em       timestamp not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfil (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2. QUIZ (container criado por qualquer usuário)
-- =========================================================
create table quiz (
    id              uuid primary key default gen_random_uuid(),
    autor_id        uuid not null references perfil(id),
    titulo          varchar(150) not null,
    descricao       text,
    publico         boolean not null default true,   -- controla se aparece na busca
    criado_em       timestamp not null default now()
);

create table sistema_anatomico (
    id              uuid primary key default gen_random_uuid(),
    nome            varchar(100) not null,   -- ex: Esquelético, Muscular, Digestório
    descricao       text
);

-- peça agora pertence a um quiz específico (o autor monta o conteúdo do próprio quiz)
create table peca_anatomica (
    id              uuid primary key default gen_random_uuid(),
    quiz_id         uuid not null references quiz(id) on delete cascade,
    sistema_id      uuid references sistema_anatomico(id),
    nome            varchar(150) not null,
    descricao       text
);

create table imagem_vista (
    id              uuid primary key default gen_random_uuid(),
    peca_id         uuid not null references peca_anatomica(id) on delete cascade,
    angulo          varchar(30) not null check (angulo in
                        ('anterior', 'posterior', 'lateral_direita', 'lateral_esquerda', 'dorsal', 'ventral')),
    storage_path    varchar(300) not null      -- path no Supabase Storage
);

create table estrutura_anatomica (
    id              uuid primary key default gen_random_uuid(),
    sistema_id      uuid references sistema_anatomico(id),
    nome            varchar(150) not null,
    descricao       text
);

create table hotspot (
    id              uuid primary key default gen_random_uuid(),
    imagem_id       uuid not null references imagem_vista(id) on delete cascade,
    estrutura_id    uuid not null references estrutura_anatomica(id),
    tipo            varchar(10) not null default 'ponto' check (tipo in ('ponto', 'regiao')),
    coord_x         numeric(6,3) not null,   -- ponto: posição da marcação; região: canto superior esquerdo
    coord_y         numeric(6,3) not null,
    largura         numeric(6,3),            -- só preenchido quando tipo = 'regiao' (elipse inscrita no retângulo x,y,largura,altura)
    altura          numeric(6,3),
    constraint hotspot_regiao_tem_tamanho check (
        (tipo = 'ponto' and largura is null and altura is null) or
        (tipo = 'regiao' and largura is not null and altura is not null)
    )
);

create table pergunta (
    id              uuid primary key default gen_random_uuid(),
    hotspot_id      uuid not null unique references hotspot(id) on delete cascade,
    enunciado       text not null
);

create table alternativa (
    id              uuid primary key default gen_random_uuid(),
    pergunta_id     uuid not null references pergunta(id) on delete cascade,
    texto           varchar(200) not null,
    correta         boolean not null default false
);

-- =========================================================
-- 3. RESPOSTAS E PONTUAÇÃO
-- =========================================================
create table tentativa_resposta (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references perfil(id),
    quiz_id             uuid not null references quiz(id),   -- facilita rankings por quiz
    pergunta_id         uuid not null references pergunta(id),
    alternativa_id      uuid references alternativa(id),
    modo                varchar(10) not null check (modo in ('multipla', 'livre')),
    resposta_texto      varchar(200),
    acertou             boolean not null,
    pontos              integer not null default 0,
    sessao_id           uuid,   -- agrupa as respostas de uma mesma partida (gerado no client, 1 por jogada)
    respondido_em       timestamp not null default now()
);

-- pontuação agregada por quiz (para ranking/histórico de quem já jogou o quê)
create table pontuacao_quiz (
    id              uuid primary key default gen_random_uuid(),
    usuario_id      uuid not null references perfil(id),
    quiz_id         uuid not null references quiz(id),
    pontos_total    integer not null default 0,
    atualizado_em   timestamp not null default now(),
    unique (usuario_id, quiz_id)
);

create index idx_peca_quiz on peca_anatomica(quiz_id);
create index idx_imagem_peca on imagem_vista(peca_id);
create index idx_hotspot_imagem on hotspot(imagem_id);
create index idx_alternativa_pergunta on alternativa(pergunta_id);
create index idx_tentativa_usuario on tentativa_resposta(usuario_id);
create index idx_tentativa_quiz on tentativa_resposta(quiz_id);
create index idx_tentativa_sessao on tentativa_resposta(sessao_id);
create index idx_quiz_titulo on quiz using gin (to_tsvector('portuguese', titulo || ' ' || coalesce(descricao, ''))); -- busca por texto

-- =========================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =========================================================
alter table perfil enable row level security;
alter table quiz enable row level security;
alter table sistema_anatomico enable row level security;
alter table peca_anatomica enable row level security;
alter table imagem_vista enable row level security;
alter table estrutura_anatomica enable row level security;
alter table hotspot enable row level security;
alter table pergunta enable row level security;
alter table alternativa enable row level security;
alter table tentativa_resposta enable row level security;
alter table pontuacao_quiz enable row level security;

-- Funções auxiliares (security definer) pra checar dono/visibilidade do quiz sem
-- disparar RLS aninhada em cada tabela do caminho (peca -> imagem -> hotspot -> pergunta
-- -> alternativa). Cada uma faz UM lookup indexado; evita o "RLS dentro de RLS" que
-- causa "canceling statement due to statement timeout" em cadeias profundas.
create function public.quiz_dono(p_quiz_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from quiz where id = p_quiz_id and autor_id = (select auth.uid()));
$$;

create function public.quiz_visivel(p_quiz_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from quiz where id = p_quiz_id and (publico = true or autor_id = (select auth.uid())));
$$;

create function public.peca_quiz_id(p_peca_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select quiz_id from peca_anatomica where id = p_peca_id;
$$;

create function public.imagem_quiz_id(p_imagem_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.peca_quiz_id(peca_id) from imagem_vista where id = p_imagem_id;
$$;

create function public.hotspot_quiz_id(p_hotspot_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.imagem_quiz_id(imagem_id) from hotspot where id = p_hotspot_id;
$$;

create function public.pergunta_quiz_id(p_pergunta_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select public.hotspot_quiz_id(hotspot_id) from pergunta where id = p_pergunta_id;
$$;

-- PERFIL
create policy "perfil_select_all" on perfil for select using ((select auth.role()) = 'authenticated');
create policy "perfil_update_own" on perfil for update using ((select auth.uid()) = id);

-- QUIZ: todo mundo autenticado vê quizzes públicos; autor gerencia o próprio
create policy "quiz_select_public" on quiz for select using (publico = true or autor_id = (select auth.uid()));
create policy "quiz_insert_own" on quiz for insert with check (autor_id = (select auth.uid()));
create policy "quiz_update_own" on quiz for update using (autor_id = (select auth.uid()));
create policy "quiz_delete_own" on quiz for delete using (autor_id = (select auth.uid()));

-- SISTEMA_ANATOMICO: lista fixa de referência, leitura livre, escrita por qualquer autenticado
create policy "sistema_select_all" on sistema_anatomico for select using ((select auth.role()) = 'authenticated');
create policy "sistema_insert_auth" on sistema_anatomico for insert with check ((select auth.role()) = 'authenticated');

-- ESTRUTURA_ANATOMICA: idem
create policy "estrutura_select_all" on estrutura_anatomica for select using ((select auth.role()) = 'authenticated');
create policy "estrutura_insert_auth" on estrutura_anatomica for insert with check ((select auth.role()) = 'authenticated');

-- PECA_ANATOMICA / IMAGEM_VISTA / HOTSPOT / PERGUNTA / ALTERNATIVA: seguem a visibilidade
-- do quiz pai; só o autor do quiz edita. Usa as funções acima em vez de EXISTS+JOIN direto.
create policy "peca_select_via_quiz" on peca_anatomica for select using (quiz_visivel(quiz_id));
create policy "peca_write_own_quiz" on peca_anatomica for all using (quiz_dono(quiz_id));

create policy "imagem_select_via_quiz" on imagem_vista for select using (quiz_visivel(peca_quiz_id(peca_id)));
create policy "imagem_write_own_quiz" on imagem_vista for all using (quiz_dono(peca_quiz_id(peca_id)));

create policy "hotspot_select_via_quiz" on hotspot for select using (quiz_visivel(imagem_quiz_id(imagem_id)));
create policy "hotspot_write_own_quiz" on hotspot for all using (quiz_dono(imagem_quiz_id(imagem_id)));

create policy "pergunta_select_via_quiz" on pergunta for select using (quiz_visivel(hotspot_quiz_id(hotspot_id)));
create policy "pergunta_write_own_quiz" on pergunta for all using (quiz_dono(hotspot_quiz_id(hotspot_id)));

-- ALTERNATIVA: leitura liberada (correção de fato deve ir por RPC, não client direto)
create policy "alternativa_select_via_quiz" on alternativa for select using (quiz_visivel(pergunta_quiz_id(pergunta_id)));
create policy "alternativa_write_own_quiz" on alternativa for all using (quiz_dono(pergunta_quiz_id(pergunta_id)));

-- TENTATIVA_RESPOSTA e PONTUACAO_QUIZ: cada um só mexe no próprio histórico
create policy "tentativa_select_own" on tentativa_resposta for select using ((select auth.uid()) = usuario_id);
create policy "tentativa_insert_own" on tentativa_resposta for insert with check ((select auth.uid()) = usuario_id);

create policy "pontuacao_select_all" on pontuacao_quiz for select using ((select auth.role()) = 'authenticated');
create policy "pontuacao_insert_own" on pontuacao_quiz for insert with check ((select auth.uid()) = usuario_id);
create policy "pontuacao_update_own" on pontuacao_quiz for update using ((select auth.uid()) = usuario_id);

-- =========================================================
-- 5. FUNCTIONS (RPC)
-- =========================================================
-- Ver db/functions/corrigir_resposta.sql — roda logo após este schema.
-- Correção de resposta e cálculo de pontuação sempre via RPC, nunca no client.
