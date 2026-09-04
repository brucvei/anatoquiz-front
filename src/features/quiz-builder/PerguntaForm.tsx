import { useEffect, useState } from 'react';
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

function erroMensagem(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Erro ao salvar';
}

interface PerguntaFormProps {
  hotspotId: string;
  onClose: () => void;
}

export function PerguntaForm({ hotspotId, onClose }: PerguntaFormProps) {
  const [perguntaId, setPerguntaId] = useState<string | null>(null);
  const [enunciado, setEnunciado] = useState('');
  const [alternativas, setAlternativas] = useState<AlternativaCampo[]>(alternativasVazias());
  const [correta, setCorreta] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

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
        if (alts.length === 4) {
          setAlternativas(alts.map((a) => ({ id: a.id, texto: a.texto })));
          setCorreta(alts.findIndex((a) => a.correta));
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
    return <p className="text-sm text-center">Carregando...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-heading">{perguntaId ? 'Editar pergunta' : 'Nova pergunta'}</h2>

      <textarea
        placeholder="Enunciado da pergunta"
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
        className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-16"
      />

      {alternativas.map((alt, i) => (
        <label key={i} className="flex items-center gap-2">
          <input type="radio" name="correta" checked={correta === i} onChange={() => setCorreta(i)} />
          <input
            type="text"
            placeholder={`Alternativa ${i + 1}`}
            value={alt.texto}
            onChange={(e) => handleAlternativaChange(i, e.target.value)}
            className="flex-1 bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
        </label>
      ))}
      <p className="text-xs text-accent-700/70">Marque o círculo da alternativa correta.</p>

      {erro && <p className="text-accent-700 text-sm">{erro}</p>}
      {salvo && !erro && <p className="text-accent-2-800 text-sm">Salvo.</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar pergunta'}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-accent-700 underline">
          Fechar
        </button>
      </div>
    </div>
  );
}
