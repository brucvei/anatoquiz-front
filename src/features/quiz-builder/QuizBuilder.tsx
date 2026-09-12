import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import type { PecaAnatomica, SistemaAnatomico } from '../../types/database';
import {
  contarVistas,
  createPeca,
  createQuiz,
  deletePeca,
  deleteQuiz,
  findOrCreateSistema,
  getQuiz,
  listPecas,
  listSistemas,
  updateQuiz,
} from './api';
import { PecaEditor } from './PecaEditor';

export function QuizBuilder() {
  const { t } = useI18n();
  const { id: idDaUrl } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quizId, setQuizId] = useState<string | null>(idDaUrl ?? null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [publico, setPublico] = useState(true);
  const [autorId, setAutorId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [carregandoQuiz, setCarregandoQuiz] = useState(Boolean(idDaUrl));
  const [statusAuto, setStatusAuto] = useState<'salvando' | 'salvo' | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pecas, setPecas] = useState<PecaAnatomica[]>([]);
  const [vistasPorPeca, setVistasPorPeca] = useState<Record<string, number>>({});
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState<string | null>(null);
  const [novaPecaNome, setNovaPecaNome] = useState('');
  const [novaPecaSistema, setNovaPecaSistema] = useState('');
  const [sistemas, setSistemas] = useState<SistemaAnatomico[]>([]);
  const [criandoPeca, setCriandoPeca] = useState(false);
  const [excluindoPecaId, setExcluindoPecaId] = useState<string | null>(null);

  useEffect(() => {
    listSistemas().then(setSistemas);
  }, []);

  useEffect(() => {
    if (!idDaUrl) return;
    getQuiz(idDaUrl).then((quiz) => {
      setTitulo(quiz.titulo);
      setDescricao(quiz.descricao ?? '');
      setPublico(quiz.publico);
      setAutorId(quiz.autor_id);
      setCarregandoQuiz(false);
    });
  }, [idDaUrl]);

  useEffect(() => {
    if (!quizId) return;
    listPecas(quizId).then(async (ps) => {
      setPecas(ps);
      if (ps.length > 0) setPecaSelecionadaId((prev) => prev ?? ps[0].id);
      const contagens = await Promise.all(ps.map((p) => contarVistas(p.id)));
      setVistasPorPeca(Object.fromEntries(ps.map((p, i) => [p.id, contagens[i]])));
    });
  }, [quizId]);

  useEffect(() => {
    if (!quizId || carregandoQuiz) return;
    setStatusAuto('salvando');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateQuiz(quizId, { titulo, descricao, publico });
        setStatusAuto('salvo');
      } catch (err) {
        setErro(erroMensagem(err));
      }
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, descricao, publico, quizId, carregandoQuiz]);

  const souDono = !idDaUrl || autorId === user?.id;

  function erroMensagem(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return t('quizForm.erroSalvar');
  }

  async function handleCriarQuiz(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErro(null);
    setLoading(true);

    try {
      const quiz = await createQuiz({ autor_id: user.id, titulo, descricao, publico });
      setQuizId(quiz.id);
      navigate(`/quiz/${quiz.id}/editar`, { replace: true });
    } catch (err) {
      setErro(erroMensagem(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuiz() {
    if (!quizId) return;
    if (!window.confirm(t('quizForm.confirmarExcluirQuiz'))) return;
    setLoading(true);
    try {
      await deleteQuiz(quizId);
      navigate('/meus-quizzes');
    } catch (err) {
      setErro(erroMensagem(err));
      setLoading(false);
    }
  }

  async function handleCriarPeca(e: FormEvent) {
    e.preventDefault();
    if (!quizId || !novaPecaNome.trim()) return;
    setCriandoPeca(true);
    try {
      const sistema = novaPecaSistema.trim() ? await findOrCreateSistema(novaPecaSistema) : null;
      const peca = await createPeca({ quiz_id: quizId, nome: novaPecaNome, sistema_id: sistema?.id });
      setPecas((prev) => [...prev, peca]);
      setVistasPorPeca((prev) => ({ ...prev, [peca.id]: 0 }));
      setPecaSelecionadaId(peca.id);
      if (sistema) setSistemas((prev) => (prev.some((s) => s.id === sistema.id) ? prev : [...prev, sistema]));
      setNovaPecaNome('');
      setNovaPecaSistema('');
    } finally {
      setCriandoPeca(false);
    }
  }

  async function handleExcluirPeca(pecaId: string) {
    if (!window.confirm(t('quizForm.confirmarExcluirPeca'))) return;
    setExcluindoPecaId(pecaId);
    try {
      await deletePeca(pecaId);
      setPecas((prev) => {
        const restantes = prev.filter((p) => p.id !== pecaId);
        if (pecaSelecionadaId === pecaId) setPecaSelecionadaId(restantes[0]?.id ?? null);
        return restantes;
      });
    } finally {
      setExcluindoPecaId(null);
    }
  }

  if (idDaUrl && carregandoQuiz) {
    return <Loading className="mt-16" />;
  }

  if (idDaUrl && !souDono) {
    return <p className="max-w-sm mx-auto mt-16 text-center">{t('quizForm.naoAutor')}</p>;
  }

  const pecaSelecionada = pecas.find((p) => p.id === pecaSelecionadaId) ?? null;
  const totalVistas = Object.values(vistasPorPeca).reduce((soma, n) => soma + n, 0);
  const etapaAtual = !quizId ? 1 : totalVistas === 0 ? 2 : 3;
  const etapas = [t('quizForm.etapa1'), t('quizForm.etapa2'), t('quizForm.etapa3')];

  return (
    <div className="w-full bg-surface flex items-stretch flex-wrap">
      <aside className="flex-none w-full md:w-72 p-6 border-b md:border-b-0 md:border-r border-divider flex flex-col gap-4">
        <form onSubmit={handleCriarQuiz} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl">{quizId ? t('quizForm.editarTitulo') : t('quizForm.criarTitulo')}</h1>
            {quizId && statusAuto && (
              <span className="text-[11px] text-accent-700/60 whitespace-nowrap">
                {statusAuto === 'salvando' ? t('quizForm.salvando') : `✓ ${t('quizForm.salvo')}`}
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder={t('campo.titulo')}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
          />
          <textarea
            placeholder={t('campo.descricao')}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-20"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
            {t('quizForm.publico')}
          </label>

          {erro && <p className="text-accent-700 text-sm">{erro}</p>}

          {!quizId && (
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50 hover:bg-accent-600"
            >
              {loading ? t('quizForm.salvando') : t('quizForm.criarTitulo')}
            </button>
          )}

          {quizId && (
            <button
              type="button"
              onClick={handleDeleteQuiz}
              disabled={loading}
              className="bg-bg border border-divider font-heading rounded-full px-3 py-1.5 text-xs self-center"
            >
              {t('quizForm.excluirQuiz')}
            </button>
          )}
        </form>

        {quizId && (
          <>
            <div className="border-t border-divider pt-4">
              <span className="text-xs uppercase tracking-wide font-bold text-accent-700/70">
                {t('quizForm.pecas')}
              </span>
              <div className="flex flex-col gap-2 mt-2">
                {pecas.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold cursor-pointer ${
                      pecaSelecionadaId === p.id ? 'bg-accent-200' : 'bg-neutral-200'
                    }`}
                    onClick={() => setPecaSelecionadaId(p.id)}
                  >
                    <span>
                      {p.nome}{' '}
                      <span className="font-normal opacity-60">
                        · {t('quizForm.vistasCount', { n: vistasPorPeca[p.id] ?? 0 })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExcluirPeca(p.id);
                      }}
                      disabled={excluindoPecaId === p.id}
                      className="bg-bg border border-divider font-heading rounded-full px-3 py-1 text-xs disabled:opacity-50 flex-none ml-2"
                    >
                      {excluindoPecaId === p.id ? t('myQuizzes.excluindo') : t('quizForm.excluirPeca')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCriarPeca} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder={t('pecaForm.nomePeca')}
                value={novaPecaNome}
                onChange={(e) => setNovaPecaNome(e.target.value)}
                className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
              />
              <input
                type="text"
                list="sistemas-lista"
                placeholder={t('pecaForm.sistema')}
                value={novaPecaSistema}
                onChange={(e) => setNovaPecaSistema(e.target.value)}
                className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
              />
              <datalist id="sistemas-lista">
                {sistemas.map((s) => (
                  <option key={s.id} value={s.nome} />
                ))}
              </datalist>
              <button
                type="submit"
                disabled={criandoPeca || !novaPecaNome.trim()}
                className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
              >
                {criandoPeca ? t('pecaForm.criando') : t('quizForm.adicionarPeca')}
              </button>
            </form>

            <div className="p-3 rounded-md bg-accent-2-200 text-accent-2-800 text-xs leading-relaxed">
              {t('quizForm.dicaMarcador')}
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 min-w-0 p-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {etapas.map((label, i) => {
            const n = i + 1;
            const feita = n < etapaAtual;
            const atual = n === etapaAtual;
            return (
              <div key={n} className="flex items-center gap-2">
                <span
                  className={`flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-heading ${
                    feita ? 'bg-accent-2-600 text-bg' : atual ? 'bg-accent text-bg' : 'bg-neutral-200 text-accent-900/50'
                  }`}
                >
                  {feita ? '✓' : n}
                </span>
                <span className={`text-sm ${atual ? 'font-bold text-accent-900' : 'text-accent-900/50'}`}>{label}</span>
                {n < 3 && <span className="text-accent-900/30 mx-1">—</span>}
              </div>
            );
          })}
        </div>

        {!quizId && (
          <div className="p-5 rounded-md border-2 border-dashed border-divider text-sm text-accent-700/80 max-w-md">
            {t('quizForm.salvePrimeiro')}
          </div>
        )}
        {quizId && !pecaSelecionada && (
          <div className="p-5 rounded-md border-2 border-dashed border-divider text-sm text-accent-700/80 max-w-md">
            {t('quizForm.semPecaSelecionada')}
          </div>
        )}
        {pecaSelecionada && (
          <PecaEditor
            key={pecaSelecionada.id}
            peca={pecaSelecionada}
            onVistasCarregadas={(n) => setVistasPorPeca((prev) => ({ ...prev, [pecaSelecionada.id]: n }))}
          />
        )}
      </main>
    </div>
  );
}
