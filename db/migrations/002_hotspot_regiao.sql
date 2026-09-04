-- Adiciona suporte a hotspot por região (elipse), além de ponto.
-- Rodar uma vez no SQL Editor do Supabase (tabela hotspot já existe).

alter table hotspot add column tipo varchar(10) not null default 'ponto' check (tipo in ('ponto', 'regiao'));
alter table hotspot add column largura numeric(6,3);
alter table hotspot add column altura numeric(6,3);

alter table hotspot add constraint hotspot_regiao_tem_tamanho check (
    (tipo = 'ponto' and largura is null and altura is null) or
    (tipo = 'regiao' and largura is not null and altura is not null)
);
