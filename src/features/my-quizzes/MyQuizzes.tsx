import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { TAMANHO_PAGINA, deleteQuiz, listMeusQuizzes } from '../quiz-builder/api';
import type { Quiz } from '../../types/database';

export function MyQuizzes() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listMeusQuizzes(user.id, 0)
      .then((qs) => {
        setQuizzes(qs);
        setTemMais(qs.length === TAMANHO_PAGINA);
        setPagina(0);
      })
      .finally(() => setCarregando(false));
  }, [user]);

  async function handleCarregarMais() {
    if (!user) return;
    const proxima = pagina + 1;
    const qs = await listMeusQuizzes(user.id, proxima);
    setQuizzes((prev) => [...prev, ...qs]);
    setTemMais(qs.length === TAMANHO_PAGINA);
    setPagina(proxima);
  }

  async function handleExcluir(id: string) {
    if (!window.confirm(t('myQuizzes.confirmarExcluir'))) return;
    setExcluindoId(id);
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } finally {
      setExcluindoId(null);
    }
  }

  if (carregando) return <p className="max-w-2xl mx-auto mt-16 text-center">{t('comum.carregando')}</p>;

  return (
    <div className="max-w-2xl mx-auto mt-16 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">{t('myQuizzes.titulo')}</h1>
        <Link to="/historico" className="text-sm text-accent font-semibold underline">
          {t('myQuizzes.verHistorico')}
        </Link>
      </div>

      {quizzes.length === 0 && <p className="text-sm text-accent-700/70">{t('myQuizzes.vazio')}</p>}

      <ul className="flex flex-col gap-3">
        {quizzes.map((q) => (
          <li key={q.id} className="flex items-center justify-between p-4 bg-surface rounded-lg shadow-md">
            <div>
              <div className="font-heading text-lg">{q.titulo}</div>
              <div className="text-xs text-accent-700/70">{q.publico ? t('myQuizzes.publico') : t('myQuizzes.privado')}</div>
            </div>
            <div className="flex gap-3">
              <Link to={`/quiz/${q.id}/editar`} className="text-sm text-accent font-semibold underline">
                {t('myQuizzes.editar')}
              </Link>
              <button
                type="button"
                onClick={() => handleExcluir(q.id)}
                disabled={excluindoId === q.id}
                className="text-sm text-accent-700 underline disabled:opacity-50"
              >
                {excluindoId === q.id ? t('myQuizzes.excluindo') : t('myQuizzes.excluir')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {temMais && (
        <button
          type="button"
          onClick={handleCarregarMais}
          className="mt-4 text-sm text-accent font-semibold underline mx-auto block"
        >
          {t('comum.carregarMais')}
        </button>
      )}
    </div>
  );
}
