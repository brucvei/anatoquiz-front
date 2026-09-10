import { useEffect, useState } from 'react';
import { Loading } from '../../components/Loading';
import { useI18n } from '../../i18n';
import {
  createAlternativa,
  createPergunta,
  getPerguntaDoHotspot,
  listAlternativas,
  updateAlternativa,
  updatePergunta,
} from './api';

interface AlternativaCampo {
  id: string | null;
  texto: string;
}

function alternativasVazias(): AlternativaCampo[] {
  return [
    { id: null, texto: '' },
    { id: null, texto: '' },
    { id: null, texto: '' },
    { id: null, texto: '' },
  ];
}

interface PerguntaFormProps {
  hotspotId: string;
  onClose: () => void;
}

export function PerguntaForm({ hotspotId, onClose }: PerguntaFormProps) {
  const { t } = useI18n();
  const [perguntaId, setPerguntaId] = useState<string | null>(null);
  const [enunciado, setEnunciado] = useState('');
  const [alternativas, setAlternativas] = useState<AlternativaCampo[]>(alternativasVazias());
  const [correta, setCorreta] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function erroMensagem(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return t('perguntaForm.erroSalvar');
  }

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const pergunta = await getPerguntaDoHotspot(hotspotId);
      if (!ativo) return;
      if (pergunta) {
        setPerguntaId(pergunta.id);
        setEnunciado(pergunta.enunciado);
        const alts = await listAlternativas(pergunta.id);
        if (!ativo) return;
        if (alts.length > 0) {
          const carregadas: AlternativaCampo[] = alts.map((a) => ({ id: a.id, texto: a.texto }));
          while (carregadas.length < 4) carregadas.push({ id: null, texto: '' });
          setAlternativas(carregadas);
          const idxCorreta = alts.findIndex((a) => a.correta);
          setCorreta(idxCorreta === -1 ? 0 : idxCorreta);
        }
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [hotspotId]);

  function handleAlternativaChange(index: number, texto: string) {
    setAlternativas((prev) => prev.map((a, i) => (i === index ? { ...a, texto } : a)));
    setSalvo(false);
  }

  async function handleSalvar() {
    if (!enunciado.trim() || alternativas.some((a) => !a.texto.trim())) return;
    setErro(null);
    setSalvando(true);
    try {
      let pId = perguntaId;
      if (pId) {
        await updatePergunta(pId, enunciado);
      } else {
        const pergunta = await createPergunta({ hotspot_id: hotspotId, enunciado });
        pId = pergunta.id;
        setPerguntaId(pId);
      }

      for (let i = 0; i < alternativas.length; i++) {
        const alt = alternativas[i];
        const isCorreta = i === correta;
        if (alt.id) {
          await updateAlternativa(alt.id, { texto: alt.texto, correta: isCorreta });
        } else {
          const criada = await createAlternativa({ pergunta_id: pId, texto: alt.texto, correta: isCorreta });
          setAlternativas((prev) => prev.map((a, i2) => (i2 === i ? { ...a, id: criada.id } : a)));
        }
      }

      setSalvo(true);
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/60">
        {t('perguntaForm.kicker')}
      </span>
      <h2 className="text-lg font-heading -mt-2">{perguntaId ? t('perguntaForm.editar') : t('perguntaForm.nova')}</h2>

      <textarea
        placeholder={t('perguntaForm.enunciado')}
        value={enunciado}
        onChange={(e) => {
          setEnunciado(e.target.value);
          setSalvo(false);
        }}
        className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-16"
      />

      {alternativas.map((alt, i) => (
        <label key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name="correta"
            checked={correta === i}
            onChange={() => {
              setCorreta(i);
              setSalvo(false);
            }}
          />
          <input
            type="text"
            placeholder={t('perguntaForm.alternativa', { n: i + 1 })}
            value={alt.texto}
            onChange={(e) => handleAlternativaChange(i, e.target.value)}
            className="flex-1 bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
        </label>
      ))}
      <p className="text-xs text-accent-700/70">{t('perguntaForm.marqueCorreta')}</p>

      {erro && (
        <div className="p-3 rounded-md text-sm border-2 bg-accent-200 border-accent-700 text-accent-900">{erro}</div>
      )}
      {salvo && !erro && (
        <div className="p-3 rounded-md text-sm border-2 bg-accent-2-200 border-accent-2-600 text-accent-2-900 flex items-center gap-2">
          <span className="font-heading text-base">✓</span> {t('perguntaForm.salvo')}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
        >
          {salvando ? t('perguntaForm.salvando') : t('perguntaForm.salvarPergunta')}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-accent-700 underline">
          {t('comum.fechar')}
        </button>
      </div>
    </div>
  );
}
