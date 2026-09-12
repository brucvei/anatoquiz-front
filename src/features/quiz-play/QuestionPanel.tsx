import { useEffect, useState, type FormEvent } from 'react';
import type { CorrigirRespostaResult, Pergunta } from '../../types/database';
import { Loading } from '../../components/Loading';
import { useI18n } from '../../i18n';
import { corrigirResposta, getPerguntaDoHotspot, listAlternativasJogo } from './api';

interface QuestionPanelProps {
  hotspotId: string;
  sessaoId: string;
  resultadoExistente?: CorrigirRespostaResult;
  onRespondido: (hotspotId: string, resultado: CorrigirRespostaResult) => void;
}

type Fase = 'livre' | 'multipla';

export function QuestionPanel({ hotspotId, sessaoId, resultadoExistente, onRespondido }: QuestionPanelProps) {
  const { t } = useI18n();
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [alternativas, setAlternativas] = useState<{ id: string; texto: string }[]>([]);
  const [fase, setFase] = useState<Fase>('livre');
  const [respostaLivre, setRespostaLivre] = useState('');
  const [erroLivre, setErroLivre] = useState(false);
  const [respondendo, setRespondendo] = useState(false);
  const [resultado, setResultado] = useState<CorrigirRespostaResult | null>(resultadoExistente ?? null);
  const [alternativaEscolhida, setAlternativaEscolhida] = useState<string | null>(null);

  useEffect(() => {
    setPergunta(null);
    setFase('livre');
    setRespostaLivre('');
    setErroLivre(false);
    setResultado(resultadoExistente ?? null);
    setAlternativaEscolhida(null);

    getPerguntaDoHotspot(hotspotId).then(async (p) => {
      setPergunta(p);
      if (p) setAlternativas(await listAlternativasJogo(p.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotId]);

  async function handleResponderLivre(e: FormEvent) {
    e.preventDefault();
    if (!pergunta || respondendo || !respostaLivre.trim()) return;
    setRespondendo(true);
    try {
      const r = await corrigirResposta({ pergunta_id: pergunta.id, modo: 'livre', resposta_texto: respostaLivre, sessao_id: sessaoId });
      if (r.acertou) {
        setResultado(r);
        onRespondido(hotspotId, r);
      } else {
        setErroLivre(true);
        setFase('multipla');
      }
    } finally {
      setRespondendo(false);
    }
  }

  async function handleResponderMultipla(alternativaId: string) {
    if (!pergunta || respondendo || resultado) return;
    setAlternativaEscolhida(alternativaId);
    setRespondendo(true);
    try {
      const r = await corrigirResposta({ pergunta_id: pergunta.id, modo: 'multipla', alternativa_id: alternativaId, sessao_id: sessaoId });
      setResultado(r);
      onRespondido(hotspotId, r);
    } finally {
      setRespondendo(false);
    }
  }

  if (!pergunta) return <Loading />;

  const LETRAS = 'ABCD';

  return (
    <div>
      <span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/60">
        {t('questionModal.kicker')}
      </span>
      <h2 className="text-lg font-heading mb-4 mt-1">{pergunta.enunciado}</h2>

      {!resultado && fase === 'livre' && (
        <form onSubmit={handleResponderLivre} className="flex flex-col gap-2">
          <p className="text-xs text-accent-700/70">{t('questionModal.dicaLivre')}</p>
          <input
            type="text"
            placeholder={t('questionModal.digiteResposta')}
            value={respostaLivre}
            onChange={(e) => setRespostaLivre(e.target.value)}
            disabled={respondendo}
            autoFocus
            className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={respondendo || !respostaLivre.trim()}
              className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
            >
              {respondendo ? t('questionModal.verificando') : t('questionModal.responder')}
            </button>
            <button
              type="button"
              onClick={() => setFase('multipla')}
              disabled={respondendo}
              className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
            >
              {t('questionModal.pular')}
            </button>
          </div>
        </form>
      )}

      {!resultado && fase === 'multipla' && (
        <>
          {erroLivre && <p className="text-xs text-accent-700/70 mb-2">{t('questionModal.naoFoiEssa')}</p>}
          <div className="flex flex-col gap-2">
            {alternativas.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleResponderMultipla(a.id)}
                disabled={respondendo}
                className="flex items-center gap-3 text-left px-4 py-3 rounded-md text-sm font-semibold border-2 bg-bg border-divider disabled:cursor-default"
              >
                <span className="flex-none w-[26px] h-[26px] rounded-full bg-neutral-200 flex items-center justify-center text-xs font-heading">
                  {LETRAS[i]}
                </span>
                <span className="flex-1">{a.texto}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {resultado && fase === 'multipla' && alternativaEscolhida && (
        <div className="flex flex-col gap-2 mb-2">
          {alternativas.map((a, i) => {
            const acerto = i === alternativas.findIndex((alt) => alt.id === alternativaEscolhida) && resultado.acertou;
            const escolhida = alternativaEscolhida === a.id;
            const estilo = escolhida
              ? resultado.acertou
                ? 'bg-accent-2-200 border-accent-2-600 text-accent-2-900'
                : 'bg-accent-200 border-accent-700 text-accent-900'
              : 'bg-bg border-divider text-accent-900/45';
            const chip = escolhida
              ? resultado.acertou
                ? 'bg-accent-2-600 text-bg'
                : 'bg-accent-700 text-bg'
              : 'bg-neutral-200';
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold border-2 ${estilo}`}
              >
                <span className={`flex-none w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-heading ${chip}`}>
                  {LETRAS[i]}
                </span>
                <span className="flex-1">{a.texto}</span>
                {escolhida && <span className="text-base font-bold">{acerto ? '✓' : '✕'}</span>}
              </div>
            );
          })}
        </div>
      )}

      {resultado && (
        <div
          className={`mt-2 p-3 rounded-md text-sm border-2 ${
            resultado.acertou
              ? 'bg-accent-2-200 border-accent-2-600 text-accent-2-900'
              : 'bg-accent-200 border-accent-700 text-accent-900'
          }`}
        >
          <p className="font-heading text-base">
            {resultado.acertou
              ? t('questionModal.acertou', { pontos: resultado.pontos })
              : t('questionModal.naoFoiDessaVez')}
          </p>
          {!resultado.acertou && (
            <p className="mt-1 opacity-80">
              {t('questionModal.respostaCorreta', { estrutura: resultado.estrutura_correta })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
