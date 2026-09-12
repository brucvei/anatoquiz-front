import { useEffect, useState } from 'react';
import type { Angulo, ImagemVista, PecaAnatomica } from '../../types/database';
import { useI18n } from '../../i18n';
import { createVista, listVistas } from './api';
import { HotspotPanel } from './HotspotPanel';
import { ImageUpload } from './ImageUpload';
import { PerguntaForm } from './PerguntaForm';

const ANGULOS: Angulo[] = ['anterior', 'posterior', 'lateral_direita', 'lateral_esquerda', 'dorsal', 'ventral'];

interface PecaEditorProps {
  peca: PecaAnatomica;
  onVistasCarregadas?: (n: number) => void;
}

export function PecaEditor({ peca, onVistasCarregadas }: PecaEditorProps) {
  const { t } = useI18n();
  const [vistas, setVistas] = useState<ImagemVista[]>([]);
  const [vistaAtivaId, setVistaAtivaId] = useState<string | null>(null);
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [angulo, setAngulo] = useState<Angulo>('anterior');

  useEffect(() => {
    setVistaAtivaId(null);
    listVistas(peca.id).then((vs) => {
      setVistas(vs);
      onVistasCarregadas?.(vs.length);
      if (vs.length > 0) setVistaAtivaId(vs[0].id);
      setMostrarUpload(vs.length === 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peca.id]);

  async function handleUploaded(storagePath: string) {
    const vista = await createVista({ peca_id: peca.id, angulo, storage_path: storagePath });
    setVistas((prev) => {
      const novas = [...prev, vista];
      onVistasCarregadas?.(novas.length);
      return novas;
    });
    setVistaAtivaId(vista.id);
    setMostrarUpload(false);
  }

  const vistaAtiva = vistas.find((v) => v.id === vistaAtivaId) ?? null;

  return (
    <div>
      {mostrarUpload && (
        <div className="p-4 rounded-md bg-bg mb-3">
          <p className="text-sm font-semibold mb-3">{t('pecaForm.escolhaAnguloEEnvie')}</p>
          <div className="flex items-center gap-2 flex-wrap">
          <select
            value={angulo}
            onChange={(e) => setAngulo(e.target.value as Angulo)}
            className="bg-surface border border-divider rounded-full px-3 py-2 text-sm"
          >
            {ANGULOS.map((a) => (
              <option key={a} value={a}>
                {t(`angulo.${a}`)}
              </option>
            ))}
          </select>
          <ImageUpload quizId={peca.quiz_id} onUploaded={handleUploaded} />
          </div>
        </div>
      )}

      {vistaAtiva && !mostrarUpload && (
        <HotspotPanel
          vistaId={vistaAtiva.id}
          storagePath={vistaAtiva.storage_path}
          titulo={`${peca.nome} — ${t('quizForm.vistaDe', { angulo: t(`angulo.${vistaAtiva.angulo}`) })}`}
          renderPainelLateral={(hotspotId, onExcluir, onFechar) => (
            <div className="p-4 bg-surface rounded-lg border border-divider flex flex-col gap-3">
              <PerguntaForm hotspotId={hotspotId} onClose={onFechar} />
              <button
                type="button"
                onClick={onExcluir}
                className="bg-bg border border-divider font-heading rounded-full px-3 py-1.5 text-xs self-start"
              >
                {t('hotspotEditor.excluirHotspot')}
              </button>
            </div>
          )}
        />
      )}

      <div className="flex items-center gap-3 mt-4">
        <span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/45 flex-none">
          {t('pecaViewer.vistas')}
        </span>
        <div className="flex-1 flex gap-2 flex-wrap">
          {vistas.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVistaAtivaId(v.id);
                setMostrarUpload(false);
              }}
              className={`text-xs px-3 py-1.5 rounded-full font-bold ${
                vistaAtivaId === v.id && !mostrarUpload ? 'bg-accent text-bg' : 'border border-divider text-accent-700'
              }`}
            >
              {t(`angulo.${v.angulo}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMostrarUpload(true)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border border-dashed ${
              mostrarUpload ? 'border-accent text-accent' : 'border-divider text-accent-700/70'
            }`}
          >
            + {t('quizForm.novaVista')}
          </button>
        </div>
      </div>
    </div>
  );
}
