import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CorrigirRespostaResult, Hotspot, ImagemVista, PecaAnatomica, Quiz } from '../../types/database.ts';
import { Loading } from '../../components/Loading.tsx';
import { useI18n } from '../../i18n';
import { getQuiz, getSistemaDaPeca, listPecas, listVistas } from '../quiz-builder/api.ts';
import { listHotspotsDaPeca } from './api.ts';
import { PecaViewer } from './PecaViewer.tsx';
import { QuestionPanel } from './QuestionPanel.tsx';

export function QuizPlay() {
  const { t } = useI18n();
  const { id } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pecas, setPecas] = useState<PecaAnatomica[]>([]);
  const [pecaAtual, setPecaAtual] = useState<PecaAnatomica | null>(null);

  const [vistas, setVistas] = useState<ImagemVista[]>([]);
  const [vistaAtual, setVistaAtual] = useState<ImagemVista | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respondidos, setRespondidos] = useState<Map<string, CorrigirRespostaResult>>(new Map());
  const [sessaoId, setSessaoId] = useState(() => crypto.randomUUID());
  const [sistemaNome, setSistemaNome] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getQuiz(id).then(setQuiz);
    listPecas(id).then((ps) => {
      setPecas(ps);
      if (ps.length > 0) setPecaAtual(ps[0]);
    });
  }, [id]);

  useEffect(() => {
    if (!pecaAtual) return;
    setIndiceAtual(0);
    setRespondidos(new Map());
    setSessaoId(crypto.randomUUID());
    listVistas(pecaAtual.id).then((vs) => {
      setVistas(vs);
      if (vs.length > 0) setVistaAtual(vs[0]);
    });
    listHotspotsDaPeca(pecaAtual.id).then(setHotspots);
    getSistemaDaPeca(pecaAtual.sistema_id).then(setSistemaNome);
  }, [pecaAtual]);

  const hotspotAtual = hotspots[indiceAtual] ?? null;

  useEffect(() => {
    if (!hotspotAtual) return;
    const vistaDoHotspot = vistas.find((v) => v.id === hotspotAtual.imagem_id);
    if (vistaDoHotspot) setVistaAtual(vistaDoHotspot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotAtual?.id, vistas]);

  function handleRespondido(hotspotId: string, resultado: CorrigirRespostaResult) {
    setRespondidos((prev) => new Map(prev).set(hotspotId, resultado));
  }

  if (!quiz) return <Loading className="mt-16" />;

  if (pecas.length > 0 && hotspots.length === 0) {
    return <Loading className="mt-16" />;
  }

  const totalPerguntas = hotspots.length;
  const maxIndiceAlcancavel = Math.min(totalPerguntas - 1, respondidos.size);
  const progresso = totalPerguntas > 0 ? (respondidos.size / totalPerguntas) * 100 : 0;
  const concluido = totalPerguntas > 0 && respondidos.size === totalPerguntas;
  const hotspotsRespondidos = hotspots.filter((h) => respondidos.has(h.id));
  const resultadoAtual = hotspotAtual ? respondidos.get(hotspotAtual.id) : undefined;
  const labelHotspotAtivo = resultadoAtual ? resultadoAtual.estrutura_correta : '?';

  const pontosGanhos = Array.from(respondidos.values()).reduce((soma, r) => soma + r.pontos, 0);

  return (
    <div className="w-full">
      {pecas.length === 0 && (
        <p className="p-8 text-sm text-accent-700/70">{t('quizPlay.semPecas')}</p>
      )}

      {pecas.length > 1 && (
        <div className="flex gap-2 p-4 flex-wrap bg-surface border-b border-divider">
          {pecas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPecaAtual(p)}
              className={`text-sm rounded-full px-4 py-1 ${
                pecaAtual?.id === p.id ? 'bg-accent text-bg' : 'bg-bg border border-divider'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {totalPerguntas > 0 && (
        <div className="flex flex-col md:flex-row items-stretch">
          <div className="flex-1 min-w-0 p-6">
            <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
              <div>
                {(sistemaNome || pecaAtual) && (
                  <div className="text-[11px] uppercase tracking-wide font-bold text-accent-700/50">
                    {[sistemaNome, pecaAtual?.nome].filter(Boolean).join(' · ')}
                  </div>
                )}
                <h1 className="text-2xl">{quiz.titulo}</h1>
              </div>
              {hotspotAtual && vistaAtual && (
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-100 text-accent-800">
                    {hotspotAtual.tipo === 'regiao' ? t('quizPlay.regiaoDestacada') : t('quizPlay.pontoIndicado')}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-2-100 text-accent-2-800">
                    {t('quizPlay.vistaTag', { angulo: t(`angulo.${vistaAtual.angulo}`) })}
                  </span>
                </div>
              )}
            </div>

            <PecaViewer
              vistas={vistas}
              vistaAtual={vistaAtual}
              onVistaChange={setVistaAtual}
              hotspotAtivo={hotspotAtual}
              hotspotsRespondidos={hotspotsRespondidos}
              labelHotspotAtivo={labelHotspotAtivo}
            />
          </div>

          <div className="flex-none w-full md:w-[420px] p-6 bg-surface border-t md:border-t-0 md:border-l border-divider flex flex-col">
            <div className="flex items-center justify-between text-xs font-bold text-accent-700/70 mb-2">
              <span>{t('quizPlay.perguntaXdeY', { atual: indiceAtual + 1, total: totalPerguntas })}</span>
              <span className="text-accent-700">{t('quizPlay.pontos', { n: pontosGanhos })}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-300 overflow-hidden mb-6">
              <div className="h-full bg-accent transition-all" style={{ width: `${progresso}%` }} />
            </div>

            {hotspotAtual && (
              <QuestionPanel
                key={hotspotAtual.id}
                hotspotId={hotspotAtual.id}
                sessaoId={sessaoId}
                resultadoExistente={respondidos.get(hotspotAtual.id)}
                onRespondido={handleRespondido}
              />
            )}

            <div className="flex items-center justify-between mt-auto pt-4">
              <button
                type="button"
                onClick={() => setIndiceAtual((i) => Math.max(0, i - 1))}
                disabled={indiceAtual === 0}
                className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm disabled:opacity-30"
              >
                {t('quizPlay.anterior')}
              </button>

              {concluido ? (
                <Link
                  to={`/quiz/${id}/resultado`}
                  state={{ sessaoId }}
                  className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm"
                >
                  {t('quizPlay.verResultado')}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndiceAtual((i) => Math.min(maxIndiceAlcancavel, i + 1))}
                  disabled={indiceAtual >= maxIndiceAlcancavel}
                  className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-30"
                >
                  {t('quizPlay.proxima')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
