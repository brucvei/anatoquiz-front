import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { TAMANHO_PAGINA, listMeuHistorico, type HistoricoItem } from '../quiz-play/api';

export function History() {
  const { t, idioma } = useI18n();
  const { user } = useAuth();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) return;
    listMeuHistorico(user.id, 0)
      .then((h) => {
        setHistorico(h);
        setTemMais(h.length === TAMANHO_PAGINA);
        setPagina(0);
      })
      .finally(() => setCarregando(false));
  }, [user]);

  async function handleCarregarMais() {
    if (!user) return;
    const proxima = pagina + 1;
    const h = await listMeuHistorico(user.id, proxima);
    setHistorico((prev) => [...prev, ...h]);
    setTemMais(h.length === TAMANHO_PAGINA);
    setPagina(proxima);
  }

  if (carregando) return <Loading className="mt-16" />;

  return (
    <div className="max-w-2xl mx-auto mt-16 p-8">
      <h1 className="text-2xl mb-6">{t('history.titulo')}</h1>

      {historico.length === 0 && <p className="text-sm text-accent-700/70">{t('history.vazio')}</p>}

      <ul className="flex flex-col gap-3">
        {historico.map((h) => (
          <li key={h.quiz_id} className="flex items-center justify-between p-4 bg-surface rounded-lg shadow-md">
            <div>
              <div className="font-heading text-lg">{h.quiz?.titulo ?? t('history.quizRemovido')}</div>
              <div className="text-xs text-accent-700/70">
                {new Date(h.atualizado_em).toLocaleDateString(idioma === 'es' ? 'es-CL' : 'pt-BR')}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-heading text-accent-700">{t('history.pontos', { n: h.pontos_total })}</span>
              <Link
                to={`/quiz/${h.quiz_id}/resultado`}
                className="bg-bg border border-divider font-heading rounded-full px-3 py-1.5 text-sm"
              >
                {t('history.ver')}
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {temMais && (
        <button
          type="button"
          onClick={handleCarregarMais}
          className="mt-4 bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm mx-auto block"
        >
          {t('comum.carregarMais')}
        </button>
      )}
    </div>
  );
}
