import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { EstruturaAnatomica, Hotspot, TipoHotspot } from '../../types/database';
import { useConfirm } from '../../components/ConfirmProvider';
import { Loading } from '../../components/Loading';
import { useI18n } from '../../i18n';
import {
  createHotspot,
  deleteHotspot,
  findOrCreateEstrutura,
  getImagemUrl,
  listEstruturas,
  listHotspots,
  updateHotspot,
} from './api';

interface Pendente {
  tipo: TipoHotspot;
  coord_x: number;
  coord_y: number;
  largura?: number;
  altura?: number;
}

interface ArrastandoHotspot {
  id: string;
  origX: number;
  origY: number;
  x: number;
  y: number;
}

const LIMIAR_MOVIMENTO = 0.004;

interface HotspotPanelProps {
  vistaId: string;
  storagePath: string;
  titulo: string;
  renderPainelLateral?: (hotspotId: string, onExcluir: () => void, onFechar: () => void) => ReactNode;
}

export function HotspotPanel({ vistaId, storagePath, titulo, renderPainelLateral }: HotspotPanelProps) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const imgRef = useRef<HTMLDivElement>(null);

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
  const [arrastandoHotspot, setArrastandoHotspot] = useState<ArrastandoHotspot | null>(null);

  function erroMensagem(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return t('hotspotEditor.erroGenerico');
  }

  useEffect(() => {
    getImagemUrl(storagePath).then(setImageUrl);
    listHotspots(vistaId).then(setHotspots);
    listEstruturas().then(setEstruturas);
  }, [vistaId, storagePath]);

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
    if (modo !== 'regiao' || pendente || arrastandoHotspot) return;
    setArrastando(relativePos(e));
  }

  function handleMouseMove(e: MouseEvent) {
    if (!arrastandoHotspot) return;
    const { x, y } = relativePos(e);
    setArrastandoHotspot((prev) => (prev ? { ...prev, x, y } : prev));
  }

  async function handleMouseUp(e: MouseEvent) {
    if (arrastandoHotspot) {
      const solto = arrastandoHotspot;
      setArrastandoHotspot(null);
      const moveu =
        Math.abs(solto.x - solto.origX) > LIMIAR_MOVIMENTO || Math.abs(solto.y - solto.origY) > LIMIAR_MOVIMENTO;
      if (!moveu) {
        setHotspotSelecionado(solto.id);
        return;
      }
      setHotspots((prev) => prev.map((h) => (h.id === solto.id ? { ...h, coord_x: solto.x, coord_y: solto.y } : h)));
      try {
        await updateHotspot(solto.id, { coord_x: solto.x, coord_y: solto.y });
      } catch (err) {
        setErro(erroMensagem(err));
      }
      return;
    }

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

  function handleMarcadorMouseDown(e: MouseEvent, h: Hotspot) {
    e.stopPropagation();
    if (pendente) return;
    setArrastandoHotspot({ id: h.id, origX: h.coord_x, origY: h.coord_y, x: h.coord_x, y: h.coord_y });
  }

  async function handleSalvar() {
    if (!pendente || !nomeEstrutura.trim()) return;
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
      setHotspotSelecionado(hotspot.id);
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  function nomeDaEstrutura(id: string) {
    return estruturas.find((e) => e.id === id)?.nome ?? '?';
  }

  async function handleExcluirHotspot(id: string) {
    if (!(await confirm(t('hotspotEditor.confirmarExcluirHotspot')))) return;
    await deleteHotspot(id);
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setHotspotSelecionado(null);
  }

  if (!imageUrl) return <Loading />;

  return (
    <div className="flex gap-4 items-start flex-wrap">
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="m-0">{titulo}</h4>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/45">
            {t('hotspotEditor.marcador')}
          </span>
          <div className="flex gap-1.5 p-1 rounded-full bg-neutral-200">
            <button
              type="button"
              onClick={() => setModo('ponto')}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold ${modo === 'ponto' ? 'bg-accent text-bg' : 'text-accent-900/60'}`}
            >
              {t('hotspotEditor.ponto')}
            </button>
            <button
              type="button"
              onClick={() => setModo('regiao')}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold ${modo === 'regiao' ? 'bg-accent text-bg' : 'text-accent-900/60'}`}
            >
              {t('hotspotEditor.regiao')}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={imgRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full aspect-[4/3] bg-neutral-200 rounded-lg overflow-hidden cursor-crosshair select-none border-2 border-dashed border-neutral-400"
      >
        <img src={imageUrl} alt="" className="w-full h-full object-contain pointer-events-none" />

        {hotspots.map((h) => {
          const emArrasto = arrastandoHotspot?.id === h.id;
          const cx = emArrasto ? arrastandoHotspot!.x : h.coord_x;
          const cy = emArrasto ? arrastandoHotspot!.y : h.coord_y;
          return (
            <Fragment key={h.id}>
              {h.tipo === 'ponto' ? (
                <div
                  onMouseDown={(e) => handleMarcadorMouseDown(e, h)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-accent bg-accent/30 cursor-grab active:cursor-grabbing hover:bg-accent/60"
                  style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
                />
              ) : (
                <div
                  onMouseDown={(e) => handleMarcadorMouseDown(e, h)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute rounded-full border-2 border-accent-2-600 bg-accent-2-600/20 cursor-grab active:cursor-grabbing hover:bg-accent-2-600/40"
                  style={{
                    left: `${cx * 100}%`,
                    top: `${cy * 100}%`,
                    width: `${(h.largura ?? 0) * 100}%`,
                    height: `${(h.altura ?? 0) * 100}%`,
                  }}
                />
              )}
              <div
                onMouseDown={(e) => handleMarcadorMouseDown(e, h)}
                className={`absolute -translate-x-1/2 -translate-y-full text-xs font-heading px-2.5 py-0.5 rounded-full whitespace-nowrap cursor-grab active:cursor-grabbing ${
                  h.tipo === 'regiao' ? 'bg-accent-2-600 text-bg' : 'bg-accent text-bg'
                }`}
                style={{ left: `${cx * 100}%`, top: `${cy * 100 - 3}%` }}
              >
                {nomeDaEstrutura(h.estrutura_id)}
              </div>
            </Fragment>
          );
        })}

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
            list={`estruturas-lista-${vistaId}`}
            placeholder={t('hotspotEditor.nomeEstrutura')}
            value={nomeEstrutura}
            onChange={(e) => setNomeEstrutura(e.target.value)}
            autoFocus
            className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
          <datalist id={`estruturas-lista-${vistaId}`}>
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
              {salvando ? t('hotspotEditor.salvando') : t('hotspotEditor.salvarHotspot')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendente(null);
                setNomeEstrutura('');
              }}
              className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm"
            >
              {t('comum.cancelar')}
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-accent-700 text-sm mt-2">{erro}</p>}

      <p className="text-xs text-accent-700/70 mt-4">
        {t('hotspotEditor.contagem', { n: hotspots.length })}
        {modo === 'ponto' ? t('hotspotEditor.dicaPonto') : t('hotspotEditor.dicaRegiao')}
      </p>
    </div>

    {hotspotSelecionado && renderPainelLateral && (
      <div className="flex-none w-full sm:w-[320px]">
        {renderPainelLateral(
          hotspotSelecionado,
          () => handleExcluirHotspot(hotspotSelecionado),
          () => setHotspotSelecionado(null),
        )}
      </div>
    )}
    </div>
  );
}
