import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { IdiomaQuiz, Quiz, SistemaAnatomico } from "../../types/database.ts";
import { useAuth } from "../../hooks/useAuth.tsx";
import { useI18n } from "../../i18n";
import { TAMANHO_PAGINA, buscarQuizzesPublicos, getInfoCardQuiz, listSistemas, type QuizCardInfo } from "../quiz-builder/api.ts";

type QuizComInfo = Quiz & { info?: QuizCardInfo };

export function QuizSearch() {
	const { t } = useI18n();
	const { user } = useAuth();
	const [termo, setTermo] = useState("");
	const [filtroIdioma, setFiltroIdioma] = useState<IdiomaQuiz | null>(null);
	const [quizzes, setQuizzes] = useState<QuizComInfo[]>([]);
	const [sistemas, setSistemas] = useState<SistemaAnatomico[]>([]);
	const [filtroSistema, setFiltroSistema] = useState<string | null>(null);
	const [pagina, setPagina] = useState(0);
	const [temMais, setTemMais] = useState(false);
	const [carregando, setCarregando] = useState(true);

	useEffect(() => {
		listSistemas().then(setSistemas);
	}, []);

	async function comInfo(qs: Quiz[]): Promise<QuizComInfo[]> {
		return Promise.all(qs.map(async (q) => ({ ...q, info: await getInfoCardQuiz(q.id).catch(() => undefined) })));
	}

	useEffect(() => {
		setCarregando(true);
		const handle = setTimeout(() => {
			buscarQuizzesPublicos(termo, 0, filtroIdioma ?? undefined)
				.then(async (qs) => {
					setTemMais(qs.length === TAMANHO_PAGINA);
					setPagina(0);
					setQuizzes(await comInfo(qs));
				})
				.finally(() => setCarregando(false));
		}, 300);
		return () => clearTimeout(handle);
	}, [termo, filtroIdioma]);

	async function handleCarregarMais() {
		const proxima = pagina + 1;
		const qs = await buscarQuizzesPublicos(termo, proxima, filtroIdioma ?? undefined);
		const enriquecidos = await comInfo(qs);
		setQuizzes((prev) => [...prev, ...enriquecidos]);
		setTemMais(qs.length === TAMANHO_PAGINA);
		setPagina(proxima);
	}

	const listaFiltrada = filtroSistema ? quizzes.filter((q) => q.info?.sistemaNome === filtroSistema) : quizzes;

	return (
		<div className="w-full p-8">
			<h1 className="text-2xl mb-1">{t("quizSearch.titulo")}</h1>

			<div className="flex gap-2 mb-4">
				<input
					type="text"
					placeholder={t("quizSearch.placeholder")}
					value={termo}
					onChange={(e) => setTermo(e.target.value)}
					className="flex-1 bg-surface border border-divider rounded-full px-4 py-2 text-sm"
				/>
				<button type="button" className="bg-accent text-bg font-heading rounded-full px-6 text-sm">
					{t("quizSearch.buscarBotao")}
				</button>
			</div>

			<div className="flex items-center gap-2 flex-wrap mb-3">
				<span className="text-xs font-bold text-accent-700/70">{t("quizSearch.idiomaQuiz")}:</span>
				{([null, "pt-BR", "es"] as const).map((id) => (
					<button
						key={id ?? "todos"}
						type="button"
						onClick={() => setFiltroIdioma(id)}
						className={`text-xs px-3 py-1 rounded-full font-semibold ${
							filtroIdioma === id ? "bg-accent text-bg" : "border border-accent text-accent"
						}`}
					>
						{id ? t(`idiomaQuiz.${id}`) : t("quizSearch.todosIdiomas")}
					</button>
				))}
			</div>

			{sistemas.length > 0 && (
				<div className="flex gap-2 flex-wrap mb-6">
					<button
						type="button"
						onClick={() => setFiltroSistema(null)}
						className={`text-xs px-3 py-1 rounded-full font-semibold ${
							filtroSistema === null ? "bg-accent text-bg" : "border border-accent text-accent"
						}`}
					>
						{t("quizSearch.todos")}
					</button>
					{sistemas.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => setFiltroSistema(s.nome)}
							className={`text-xs px-3 py-1 rounded-full font-semibold ${
								filtroSistema === s.nome ? "bg-accent text-bg" : "border border-accent text-accent"
							}`}
						>
							{s.nome}
						</button>
					))}
				</div>
			)}

			{carregando && <p className="text-sm text-accent-700/70">{t("quizSearch.buscando")}</p>}

			{!carregando && listaFiltrada.length === 0 && <p className="text-sm text-accent-700/70">{t("quizSearch.nenhum")}</p>}

			<ul className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
				{listaFiltrada.map((q) => (
					<li key={q.id} className="bg-surface rounded-lg shadow-md overflow-hidden flex flex-col">
						<div className="relative h-[136px] bg-neutral-200">
							{q.info?.thumbnailUrl && <img src={q.info.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
							{q.info?.sistemaNome && (
								<span className="absolute top-2 left-2 bg-accent-2-100 text-accent-2-800 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
									{q.info.sistemaNome}
								</span>
							)}
						</div>
						<div className="p-4 flex flex-col gap-2 flex-1">
							<div className="font-heading text-lg leading-tight">{q.titulo}</div>
							{q.descricao && <p className="text-sm text-accent-700/70 flex-1">{q.descricao}</p>}
							<div className="flex items-center justify-between mt-auto pt-2">
								<span className="text-xs text-accent-700/60">
									{t("quizSearch.meta", { perguntas: q.info?.totalPerguntas ?? 0, jogadas: q.info?.totalJogadores ?? 0 })}
								</span>
								<div className="flex gap-2">
									{q.autor_id === user?.id && (
										<Link to={`/quiz/${q.id}/editar`} className="bg-bg border border-divider font-heading rounded-full px-3 py-1.5 text-sm">
											{t("quizSearch.editar")}
										</Link>
									)}
									<Link to={`/quiz/${q.id}/jogar`} className="bg-accent text-bg font-heading rounded-full px-4 py-1.5 text-sm">
										{t("quizSearch.jogar")}
									</Link>
								</div>
							</div>
						</div>
					</li>
				))}
			</ul>

			{temMais && (
				<button
					type="button"
					onClick={handleCarregarMais}
					className="mt-4 bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm mx-auto block"
				>
					{t("comum.carregarMais")}
				</button>
			)}
		</div>
	);
}
