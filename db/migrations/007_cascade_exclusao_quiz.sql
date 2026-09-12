-- Excluir um quiz falhava (FK violation) quando ele já tinha tentativa_resposta/pontuacao_quiz,
-- porque essas duas tabelas referenciavam quiz_id sem cascade (diferente de peca_anatomica, que já tinha).

alter table tentativa_resposta drop constraint tentativa_resposta_quiz_id_fkey;
alter table tentativa_resposta add constraint tentativa_resposta_quiz_id_fkey
  foreign key (quiz_id) references quiz(id) on delete cascade;

alter table pontuacao_quiz drop constraint pontuacao_quiz_quiz_id_fkey;
alter table pontuacao_quiz add constraint pontuacao_quiz_quiz_id_fkey
  foreign key (quiz_id) references quiz(id) on delete cascade;
