import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { createQuiz, deleteQuiz, getQuiz, updateQuiz } from './api';

function erroMensagem(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Erro ao salvar quiz';
}

export function QuizForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [publico, setPublico] = useState(true);
  const [autorId, setAutorId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregandoQuiz, setCarregandoQuiz] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getQuiz(id).then((quiz) => {
      setTitulo(quiz.titulo);
      setDescricao(quiz.descricao ?? '');
      setPublico(quiz.publico);
      setAutorId(quiz.autor_id);
      setCarregandoQuiz(false);
    });
  }, [id]);

  const souDono = !isEdit || autorId === user?.id;

  if (isEdit && carregandoQuiz) {
    return <p className="max-w-sm mx-auto mt-16 text-center">Carregando...</p>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErro(null);
    setLoading(true);

    try {
      if (isEdit && id) {
        await updateQuiz(id, { titulo, descricao, publico });
        navigate('/meus-quizzes');
      } else {
        const quiz = await createQuiz({ autor_id: user.id, titulo, descricao, publico });
        navigate(`/quiz/${quiz.id}/editar`);
      }
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setLoading(true);
    try {
      await deleteQuiz(id);
      navigate('/meus-quizzes');
    } catch (err) {
      setErro(erroMensagem(err));
      setLoading(false);
    }
  }

  if (isEdit && !souDono) {
    return <p className="max-w-sm mx-auto mt-16 text-center">Você não é o autor deste quiz.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-2">{isEdit ? 'Editar quiz' : 'Criar quiz'}</h1>

      <input
        type="text"
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />
      <textarea
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-24"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
        Público (aparece na busca)
      </label>

      {erro && <p className="text-accent-700 text-sm">{erro}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-bg font-heading rounded-full px-4 py-2 disabled:opacity-50 hover:bg-accent-600"
      >
        {loading ? 'Salvando...' : 'Salvar'}
      </button>

      {isEdit && id && (
        <>
          <Link to={`/quiz/${id}/peca/nova`} className="text-sm text-accent font-semibold underline text-center">
            + Adicionar peça
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-accent-700 text-sm underline"
          >
            Excluir quiz
          </button>
        </>
      )}
    </form>
  );
}
