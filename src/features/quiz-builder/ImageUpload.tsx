import { useState, type ChangeEvent } from 'react';
import { useI18n } from '../../i18n';
import { uploadImagemPeca } from './api.ts';

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
  quizId: string;
  onUploaded: (storagePath: string) => void;
}

export function ImageUpload({ quizId, onUploaded }: ImageUploadProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErro(t('imageUpload.tipoInvalido'));
      e.target.value = '';
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      setErro(t('imageUpload.arquivoGrande'));
      e.target.value = '';
      return;
    }

    setErro(null);
    setNomeArquivo(file.name);
    setLoading(true);
    try {
      const path = await uploadImagemPeca(quizId, file);
      onUploaded(path);
    } catch (err) {
      setErro(err && typeof err === 'object' && 'message' in err ? String(err.message) : t('imageUpload.erro'));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        className={`inline-flex items-center gap-2 w-fit cursor-pointer rounded-full px-4 py-2 text-sm border transition-colors ${
          loading ? 'bg-neutral-200 border-divider text-accent-700/60' : 'bg-bg border-divider hover:border-accent hover:text-accent'
        }`}
      >
        <span className="font-heading">+</span>
        <span>{loading ? t('imageUpload.enviando') : t('imageUpload.escolherArquivo')}</span>
        <input type="file" accept="image/*" onChange={handleChange} disabled={loading} className="hidden" />
      </label>
      {nomeArquivo && !erro && !loading && (
        <p className="text-xs text-accent-2-800 truncate max-w-64">✓ {nomeArquivo}</p>
      )}
      {erro && <p className="text-sm text-accent-700">{erro}</p>}
    </div>
  );
}
