import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Angulo, ImagemVista } from '../../types/database';
import { createPeca, createVista } from './api';
import { ImageUpload } from './ImageUpload';

const ANGULOS: { value: Angulo; label: string }[] = [
  { value: 'anterior', label: 'Anterior' },
  { value: 'posterior', label: 'Posterior' },
  { value: 'lateral_direita', label: 'Lateral direita' },
  { value: 'lateral_esquerda', label: 'Lateral esquerda' },
  { value: 'dorsal', label: 'Dorsal' },
  { value: 'ventral', label: 'Ventral' },
];

function erroMensagem(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Erro ao salvar';
}

export function PecaForm() {
  const { quizId } = useParams();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pecaId, setPecaId] = useState<string | null>(null);
  const [vistas, setVistas] = useState<ImagemVista[]>([]);
  const [angulo, setAngulo] = useState<Angulo>('anterior');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!quizId) return null;

  async function handleCreatePeca(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const peca = await createPeca({ quiz_id: quizId!, nome, descricao: descricao || undefined });
      setPecaId(peca.id);
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploaded(storagePath: string) {
    if (!pecaId) return;
    setErro(null);
    try {
      const vista = await createVista({ peca_id: pecaId, angulo, storage_path: storagePath });
      setVistas((prev) => [...prev, vista]);
    } catch (err) {
      setErro(erroMensagem(err));
    }
  }

  if (!pecaId) {
    return (
      <form onSubmit={handleCreatePeca} className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
        <h1 className="text-2xl mb-2">Nova peça</h1>

        <input
          type="text"
          placeholder="Nome da peça"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
        />
        <textarea
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-24"
        />

        {erro && <p className="text-accent-700 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-bg font-heading rounded-full px-4 py-2 disabled:opacity-50 hover:bg-accent-600"
        >
          {loading ? 'Criando...' : 'Criar peça e adicionar vistas'}
        </button>
      </form>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-2">{nome} — vistas</h1>

      <ul className="flex flex-col gap-1 text-sm">
        {vistas.map((v) => (
          <li key={v.id} className="flex items-center justify-between">
            <span>{ANGULOS.find((a) => a.value === v.angulo)?.label ?? v.angulo}</span>
            <Link to={`/vista/${v.id}/hotspots`} className="text-accent font-semibold underline text-xs">
              Marcar hotspots
            </Link>
          </li>
        ))}
      </ul>

      <label className="text-sm">
        Ângulo
        <select
          value={angulo}
          onChange={(e) => setAngulo(e.target.value as Angulo)}
          className="bg-bg border border-divider rounded-full px-4 py-2 text-sm w-full mt-1"
        >
          {ANGULOS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <ImageUpload quizId={quizId} onUploaded={handleUploaded} />

      {erro && <p className="text-accent-700 text-sm">{erro}</p>}

      <Link to="/meus-quizzes" className="text-sm text-accent font-semibold underline text-center mt-2">
        Concluir
      </Link>
    </div>
  );
}
