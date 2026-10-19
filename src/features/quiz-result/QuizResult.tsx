import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Loading } from '../../components/Loading.tsx';
import { useAuth } from '../../hooks/useAuth.tsx';
import type { Quiz } from '../../types/database.ts';
import { useI18n } from '../../i18n';
import { getQuiz } from '../quiz-builder/api.ts';
import { listMinhasTentativasComEstrutura, type TentativaComEstrutura } from '../quiz-play/api.ts';

interface Sessao {
  chave: string;
  itens: TentativaComEstrutura[];
  data: string;
  acertos: number;
  total: number;
  pontos: number;
}

function unirPorPergunta(tents: TentativaComEstrutura[]): TentativaComEstrutura[] {
  const porPergunta = new Map<string, TentativaComEstrutura>();
  for (const t of tents) {
    const atual = porPergunta.get(t.pergunta_id);
    const pontos = (atual?.pontos ?? 0) + t.pontos;
    porPergunta.set(t.pergunta_id, { ...(atual?.acertou && !t.acertou ? atual : t), pontos });
  }
  return Array.from(porPergunta.values());
}

function agruparPorSessao(tentativas: TentativaComEstrutura[]): Sessao[] {
  const grupos = new Map<string, TentativaComEstrutura[]>();
  for (const t of tentativas) {
    const chave = t.sessao_id ?? `sem-sessao-${t.respondido_em}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), t]);
  }
  return Array.from(grupos.entries())
    .map(([chave, tents]) => ({ chave, itens: unirPorPergunta(tents) }))
    .map(({ chave, itens }) => ({
      chave,
      itens,
      data: itens[0].respondido_em,
      acertos: itens.filter((i) => i.acertou).length,
      total: itens.length,
      pontos: itens.reduce((soma, i) => soma + i.pontos, 0),
    }))
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}

function ListaRevisao({ itens, t }: { itens: TentativaComEstrutura[]; t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col gap-2">
      {itens.map((t2) => (
        <div
          key={t2.id}
          className={`flex items-center gap-3 px-4 py-2 rounded-md ${t2.acertou ? 'bg-accent-2-200' : 'bg-accent-200'}`}
        >
          <span
            className={`flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg ${
              t2.acertou ? 'bg-accent-2-600' : 'bg-accent-700'
            }`}
          >
            {t2.acertou ? '✓' : '✕'}
          </span>
          <div className="flex-1 text-sm">
            <div className="font-semibold">{t2.estruturaNome}</div>
            <div className="text-xs opacity-70">
              {t2.vistaAngulo && `${t('quizPlay.vistaTag', { angulo: t(`angulo.${t2.vistaAngulo}`) })} · `}
              {!t2.acertou ? t('quizResult.errou') : t2.modo === 'livre' ? t('quizResult.acertouPrimeira') : t('quizResult.acertouAlternativa')}
            </div>
          </div>
          <span className="text-sm font-bold">{t2.acertou ? `+${t2.pontos}` : '0'} pts</span>
        </div>
      ))}
    </div>
  );
}

export function QuizResult() {
  const { t, idioma } = useI18n();
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tentativas, setTentativas] = useState<TentativaComEstrutura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sessaoExpandidaId, setSessaoExpandidaId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([getQuiz(id), listMinhasTentativasComEstrutura(id, user.id)]).then(([q, tents]) => {
      setQuiz(q);
      setTentativas(tents);
      setCarregando(false);
    });
  }, [id, user]);

  if (carregando || !quiz) return <Loading className="mt-16" />;

  const sessoes = agruparPorSessao(tentativas);
  const sessaoIdEsperada = (location.state as { sessaoId?: string } | null)?.sessaoId;
  const sessaoAtual = sessoes.find((s) => s.chave === sessaoIdEsperada) ?? sessoes[0] ?? null;
  const outrasSessoes = sessoes.filter((s) => s.chave !== sessaoAtual?.chave);

  const total = tentativas.length;

  return (
    <div className="w-full max-w-[580px] mx-auto p-8">
      <div className="flex items-center gap-6 mb-7">
        <div className="flex-none w-[132px] h-[132px] rounded-full bg-accent-200 border-[7px] border-accent flex flex-col items-center justify-center">
          <span className="font-heading text-[38px] leading-none text-accent-800">{sessaoAtual?.pontos ?? 0}</span>
          <span className="text-[10px] uppercase tracking-wide font-bold text-accent-700 mt-1">{t('quizResult.pontos')}</span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-bold text-accent-700/70">{t('quizResult.concluido')}</div>
          <h1 className="text-xl">{quiz.titulo}</h1>
          {sessaoAtual && (
            <p className="text-sm text-accent-700/70 mt-1">
              {t('quizResult.resumo', {
                acertos: sessaoAtual.acertos,
                total: sessaoAtual.total,
                aproveitamento: Math.round((sessaoAtual.acertos / sessaoAtual.total) * 100),
              })}
            </p>
          )}
        </div>
      </div>

      {total === 0 && <p className="text-sm text-accent-700/70 mb-6">{t('quizResult.vazio')}</p>}

      {sessaoAtual && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide font-bold text-accent-700/70 mb-2">
            {t('quizResult.estaJogada')}
          </div>
          <ListaRevisao itens={sessaoAtual.itens} t={t} />
        </div>
      )}

      {outrasSessoes.length > 0 && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide font-bold text-accent-700/70 mb-2">
            {t('quizResult.outrasTentativas')}
          </div>
          <div className="flex flex-col gap-2">
            {outrasSessoes.map((s) => (
              <div key={s.chave} className="border border-divider rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSessaoExpandidaId((prev) => (prev === s.chave ? null : s.chave))}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm bg-bg"
                >
                  <span>
                    {sessaoExpandidaId === s.chave ? '▾' : '▸'}{' '}
                    {new Date(s.data).toLocaleDateString(idioma === 'es' ? 'es-CL' : 'pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-bold">
                    {t('quizResult.resumoCurto', { acertos: s.acertos, total: s.total, pontos: s.pontos })}
                  </span>
                </button>
                {sessaoExpandidaId === s.chave && (
                  <div className="p-3">
                    <ListaRevisao itens={s.itens} t={t} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/quiz/${id}/ranking`}
        className="block text-center bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm mb-6"
      >
        {t('ranking.verDoQuiz')}
      </Link>

      <div className="flex gap-3">
        <Link
          to={`/quiz/${id}/jogar`}
          className="flex-1 text-center bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm"
        >
          {t('quizResult.jogarDeNovo')}
        </Link>
        <Link
          to="/buscar"
          className="flex-1 text-center bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm"
        >
          {t('quizResult.verOutros')}
        </Link>
      </div>
    </div>
  );
}
