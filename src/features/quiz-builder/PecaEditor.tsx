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
      <div className="flex gap-2 flex-wrap mb-3">
        {vistas.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVistaAtivaId(v.id);
              setMostrarUpload(false);
            }}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              vistaAtivaId === v.id && !mostrarUpload ? 'bg-accent text-bg' : 'border border-divider text-accent-700'
            }`}
          >
            {t(`angulo.${v.angulo}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMostrarUpload(true)}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border border-dashed ${
            mostrarUpload ? 'border-accent text-accent' : 'border-divider text-accent-700/70'
          }`}
        >
          + {t('quizForm.novaVista')}
        </button>
      </div>

      {mostrarUpload && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-bg rounded-md mb-3">
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
      )}

      {vistaAtiva && !mostrarUpload && (
        <div>
          <h4 className="text-sm font-heading mb-3">
            {peca.nome} — {t('quizForm.vistaDe', { angulo: t(`angulo.${vistaAtiva.angulo}`) })}
          </h4>
          <HotspotPanel
            vistaId={vistaAtiva.id}
            storagePath={vistaAtiva.storage_path}
            renderPainelLateral={(hotspotId, onExcluir, onFechar) => (
              <div className="p-4 bg-surface rounded-lg border border-divider flex flex-col gap-3">
                <PerguntaForm hotspotId={hotspotId} onClose={onFechar} />
                <button type="button" onClick={onExcluir} className="text-accent-700 text-xs underline self-start">
                  {t('hotspotEditor.excluirHotspot')}
                </button>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
