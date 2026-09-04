import { useState, type ChangeEvent } from 'react';
import { uploadImagemPeca } from './api';

interface ImageUploadProps {
  quizId: string;
  onUploaded: (storagePath: string) => void;
}

export function ImageUpload({ quizId, onUploaded }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setLoading(true);
    try {
      const path = await uploadImagemPeca(quizId, file);
      onUploaded(path);
    } catch (err) {
      setErro(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Erro ao enviar imagem');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} disabled={loading} className="text-sm" />
      {loading && <p className="text-sm text-accent-700 mt-1">Enviando...</p>}
      {erro && <p className="text-sm text-accent-700 mt-1">{erro}</p>}
    </div>
  );
}
