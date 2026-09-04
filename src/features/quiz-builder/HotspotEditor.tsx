import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { EstruturaAnatomica, Hotspot, ImagemVista, TipoHotspot } from '../../types/database';
import { createHotspot, findOrCreateEstrutura, getImagemUrl, getVista, listEstruturas, listHotspots } from './api';
import { PerguntaForm } from './PerguntaForm';

interface Pendente {
  tipo: TipoHotspot;
  coord_x: number;
  coord_y: number;
  largura?: number;
  altura?: number;
}

function erroMensagem(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Erro';
}

export function HotspotEditor() {
  const { vistaId } = useParams();
  const imgRef = useRef<HTMLDivElement>(null);

  const [vista, setVista] = useState<ImagemVista | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [estruturas, setEstruturas] = useState<EstruturaAnatomica[]>([]);
  const [modo, setModo] = useState<TipoHotspot>('ponto');
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [nomeEstrutura, setNomeEstrutura] = useState('');
  const [arrastando, setArrastando] = useState<{ x: number; y: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [hotspotSelecionado, setHotspotSelecionado] = useState<string | null>(null);

  useEffect(() => {
    if (!vistaId) return;
    getVista(vistaId).then(async (v) => {
      setVista(v);
      setImageUrl(await getImagemUrl(v.storage_path));
    });
    listHotspots(vistaId).then(setHotspots);
    listEstruturas().then(setEstruturas);
  }, [vistaId]);

  function relativePos(e: MouseEvent): { x: number; y: number } {
    const rect = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handleClick(e: MouseEvent) {
    if (modo !== 'ponto' || pendente) return;
    const { x, y } = relativePos(e);
    setPendente({ tipo: 'ponto', coord_x: x, coord_y: y });
  }

  function handleMouseDown(e: MouseEvent) {
    if (modo !== 'regiao' || pendente) return;
    setArrastando(relativePos(e));
  }

  function handleMouseUp(e: MouseEvent) {
    if (modo !== 'regiao' || !arrastando) return;
    const fim = relativePos(e);
    const x = Math.min(arrastando.x, fim.x);
    const y = Math.min(arrastando.y, fim.y);
    const largura = Math.abs(fim.x - arrastando.x);
    const altura = Math.abs(fim.y - arrastando.y);
    setArrastando(null);
    if (largura < 0.02 || altura < 0.02) return;
    setPendente({ tipo: 'regiao', coord_x: x, coord_y: y, largura, altura });
  }

  async function handleSalvar() {
    if (!pendente || !nomeEstrutura.trim() || !vistaId) return;
    setErro(null);
    setSalvando(true);
    try {
      const estrutura = await findOrCreateEstrutura(nomeEstrutura);
      const hotspot = await createHotspot({
        imagem_id: vistaId,
        estrutura_id: estrutura.id,
        tipo: pendente.tipo,
        coord_x: pendente.coord_x,
        coord_y: pendente.coord_y,
        largura: pendente.largura ?? null,
        altura: pendente.altura ?? null,
      });
      setHotspots((prev) => [...prev, hotspot]);
      setEstruturas((prev) => (prev.some((e) => e.id === estrutura.id) ? prev : [...prev, estrutura]));
      setPendente(null);
      setNomeEstrutura('');
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  function nomeDaEstrutura(id: string) {
    return estruturas.find((e) => e.id === id)?.nome ?? '?';
  }

  if (!vista || !imageUrl) return <p className="max-w-2xl mx-auto mt-16 text-center">Carregando...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-16 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-4">Hotspots — {vista.angulo}</h1>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setModo('ponto')}
          className={`text-sm rounded-full px-4 py-1 ${modo === 'ponto' ? 'bg-accent text-bg' : 'bg-bg border border-divider'}`}
        >
          Ponto
        </button>
        <button
          type="button"
          onClick={() => setModo('regiao')}
          className={`text-sm rounded-full px-4 py-1 ${modo === 'regiao' ? 'bg-accent text-bg' : 'bg-bg border border-divider'}`}
        >
          Região (arraste)
        </button>
      </div>

      <div
        ref={imgRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="relative w-full aspect-[4/3] bg-neutral-200 rounded-lg overflow-hidden cursor-crosshair select-none"
      >
        <img src={imageUrl} alt={vista.angulo} className="w-full h-full object-contain pointer-events-none" />

        {hotspots.map((h) =>
          h.tipo === 'ponto' ? (
            <div
              key={h.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHotspotSelecionado(h.id);
              }}
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-accent bg-accent/30 cursor-pointer hover:bg-accent/60"
              style={{ left: `${h.coord_x * 100}%`, top: `${h.coord_y * 100}%` }}
              title={nomeDaEstrutura(h.estrutura_id)}
            />
          ) : (
            <div
              key={h.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHotspotSelecionado(h.id);
              }}
              className="absolute rounded-full border-2 border-accent-2-600 bg-accent-2-600/20 cursor-pointer hover:bg-accent-2-600/40"
              style={{
                left: `${h.coord_x * 100}%`,
                top: `${h.coord_y * 100}%`,
                width: `${(h.largura ?? 0) * 100}%`,
                height: `${(h.altura ?? 0) * 100}%`,
              }}
              title={nomeDaEstrutura(h.estrutura_id)}
            />
          ),
        )}

        {pendente && pendente.tipo === 'ponto' && (
          <div
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-accent-700 bg-accent-700/40"
            style={{ left: `${pendente.coord_x * 100}%`, top: `${pendente.coord_y * 100}%` }}
          />
        )}
        {pendente && pendente.tipo === 'regiao' && (
          <div
            className="absolute rounded-full border-2 border-dashed border-accent-700 bg-accent-700/20"
            style={{
              left: `${pendente.coord_x * 100}%`,
              top: `${pendente.coord_y * 100}%`,
              width: `${(pendente.largura ?? 0) * 100}%`,
              height: `${(pendente.altura ?? 0) * 100}%`,
            }}
          />
        )}
      </div>

      {pendente && (
        <div className="mt-4 flex flex-col gap-2">
          <input
            type="text"
            list="estruturas-lista"
            placeholder="Nome da estrutura anatômica"
            value={nomeEstrutura}
            onChange={(e) => setNomeEstrutura(e.target.value)}
            autoFocus
            className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
          <datalist id="estruturas-lista">
            {estruturas.map((e) => (
              <option key={e.id} value={e.nome} />
            ))}
          </datalist>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando || !nomeEstrutura.trim()}
              className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar hotspot'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendente(null);
                setNomeEstrutura('');
              }}
              className="text-sm text-accent-700 underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-accent-700 text-sm mt-2">{erro}</p>}

      {hotspotSelecionado && (
        <div className="mt-4 p-4 bg-bg rounded-lg border border-divider">
          <PerguntaForm hotspotId={hotspotSelecionado} onClose={() => setHotspotSelecionado(null)} />
        </div>
      )}

      <p className="text-xs text-accent-700/70 mt-4">
        {hotspots.length} hotspot(s) nesta vista. Clique num hotspot existente pra editar a pergunta.
        {modo === 'ponto' ? ' Clique na imagem pra marcar um ponto novo.' : ' Arraste na imagem pra marcar uma região nova.'}
      </p>
    </div>
  );
}
