import { useEffect, useState } from 'react';
import type { Hotspot, ImagemVista } from '../../types/database';
import { useI18n } from '../../i18n';
import { getImagemUrl } from '../quiz-builder/api';

interface PecaViewerProps {
  vistas: ImagemVista[];
  vistaAtual: ImagemVista | null;
  onVistaChange: (vista: ImagemVista) => void;
  hotspotAtivo: Hotspot | null;
  hotspotsRespondidos: Hotspot[];
  labelHotspotAtivo: string;
}

export function PecaViewer({
  vistas,
  vistaAtual,
  onVistaChange,
  hotspotAtivo,
  hotspotsRespondidos,
  labelHotspotAtivo,
}: PecaViewerProps) {
  const { t } = useI18n();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!vistaAtual) return;
    setImageUrl(null);
    getImagemUrl(vistaAtual.storage_path).then(setImageUrl);
  }, [vistaAtual]);

  if (vistas.length === 0) {
    return <p className="text-sm text-accent-700/70">{t('pecaViewer.semVistas')}</p>;
  }

  const respondidosNaVista = hotspotsRespondidos.filter((h) => h.imagem_id === vistaAtual?.id);

  return (
    <div>
      <div className="relative w-full aspect-[4/3] bg-neutral-200 rounded-lg overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={vistaAtual ? t(`angulo.${vistaAtual.angulo}`) : ''}
            className="w-full h-full object-contain"
          />
        )}

        {respondidosNaVista.map((h) => (
          <div
            key={h.id}
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-accent-2-600 border-2 border-bg"
            style={{ left: `${h.coord_x * 100}%`, top: `${h.coord_y * 100}%` }}
            title={t('quizPlay.jaRespondida')}
          />
        ))}

        {hotspotAtivo && hotspotAtivo.imagem_id === vistaAtual?.id && (
          <>
            {hotspotAtivo.tipo === 'ponto' ? (
              <>
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-accent bg-accent/30"
                  style={{ left: `${hotspotAtivo.coord_x * 100}%`, top: `${hotspotAtivo.coord_y * 100}%` }}
                />
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-accent animate-ping"
                  style={{ left: `${hotspotAtivo.coord_x * 100}%`, top: `${hotspotAtivo.coord_y * 100}%` }}
                />
              </>
            ) : (
              <div
                className="absolute rounded-full border-2 border-dashed border-accent bg-accent/20"
                style={{
                  left: `${hotspotAtivo.coord_x * 100}%`,
                  top: `${hotspotAtivo.coord_y * 100}%`,
                  width: `${(hotspotAtivo.largura ?? 0) * 100}%`,
                  height: `${(hotspotAtivo.altura ?? 0) * 100}%`,
                }}
              />
            )}
            <div
              className="absolute -translate-x-1/2 -translate-y-full bg-accent text-bg font-heading text-xs px-3 py-1 rounded-full whitespace-nowrap shadow-md"
              style={{ left: `${hotspotAtivo.coord_x * 100}%`, top: `${hotspotAtivo.coord_y * 100 - 4}%` }}
            >
              {labelHotspotAtivo}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/45 flex-none">
          {t('pecaViewer.vistas')}
        </span>
        <div className="flex-1 flex gap-2">
          {vistas.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onVistaChange(v)}
              className={`flex-1 h-10 rounded-full text-xs font-bold transition-colors ${
                vistaAtual?.id === v.id ? 'bg-accent text-bg' : 'bg-bg border border-divider'
              }`}
            >
              {t(`angulo.${v.angulo}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
