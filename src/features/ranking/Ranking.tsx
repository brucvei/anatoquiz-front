import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { getQuiz } from '../quiz-builder/api';
import { listRankingGeral, type RankingItem } from './api';

export function Ranking() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { id: quizId } = useParams();
  const [tituloQuiz, setTituloQuiz] = useState<string | null>(null);
  const [itens, setItens] = useState<RankingItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (quizId) getQuiz(quizId).then((q) => setTituloQuiz(q?.titulo ?? null));
    listRankingGeral(quizId)
      .then(setItens)
      .finally(() => setCarregando(false));
  }, [quizId]);

  return (
    <div className="max-w-2xl mx-auto mt-16 mb-16 p-8">
      <h1 className="text-2xl mb-1">{quizId ? t('ranking.tituloQuiz', { titulo: tituloQuiz ?? '...' }) : t('ranking.titulo')}</h1>
      <p className="text-sm text-accent-700/70 mb-6 max-w-md">
        {quizId ? t('ranking.subtituloQuiz') : t('ranking.subtitulo')}
      </p>

      {carregando && <Loading />}
      {!carregando && itens.length === 0 && <p className="text-sm text-accent-700/70">{t('ranking.vazio')}</p>}

      <div className="flex flex-col gap-2">
        {itens.map((item, i) => (
          <div
            key={item.usuario_id}
            className={`flex items-center gap-4 px-4 py-3 rounded-md ${
              item.usuario_id === user?.id ? 'bg-accent-200' : 'bg-surface'
            }`}
          >
            <span className="flex-none w-8 text-center font-heading text-accent-700/70">{i + 1}</span>
            <span className="flex-1 font-semibold">{item.nomeExibicao}</span>
            {!quizId && (
              <span className="text-xs text-accent-700/70">{t('ranking.quizzes', { n: item.quizzesJogados })}</span>
            )}
            <span className="font-heading text-accent-800">{t('ranking.pontos', { n: item.pontosTotal })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
