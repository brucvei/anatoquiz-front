import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CorrigirRespostaResult, Hotspot, ImagemVista, PecaAnatomica, Quiz } from "../../types/database.ts";
import { useConfirm } from "../../components/ConfirmProvider.tsx";
import { Loading } from "../../components/Loading.tsx";
import { useI18n } from "../../i18n";
import { getQuiz, getSistemaDaPeca, listPecas, listVistas } from "../quiz-builder/api.ts";
import { listHotspotsDaPeca } from "./api.ts";
import { PecaViewer } from "./PecaViewer.tsx";
import { QuestionPanel } from "./QuestionPanel.tsx";

export function QuizPlay() {
	const { t } = useI18n();
	const { id } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const [quiz, setQuiz] = useState<Quiz | null>(null);
	const [pecas, setPecas] = useState<PecaAnatomica[]>([]);
	const [carregado, setCarregado] = useState(false);

	const [vistasPorPeca, setVistasPorPeca] = useState<Record<string, ImagemVista[]>>({});
	const [hotspotsPorPeca, setHotspotsPorPeca] = useState<Record<string, Hotspot[]>>({});
	const [indiceAtual, setIndiceAtual] = useState(0); 
	const [vistaManual, setVistaManual] = useState<{ hotspotId: string | null; vistaId: string } | null>(null);
	const [respondidos, setRespondidos] = useState<Map<string, CorrigirRespostaResult>>(new Map());
	const [sessaoId] = useState(() => crypto.randomUUID());
	const [sistemaNome, setSistemaNome] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		getQuiz(id).then(setQuiz);
		listPecas(id).then(async (ps) => {
			const dados = await Promise.all(ps.map(async (p) => [p.id, await listVistas(p.id), await listHotspotsDaPeca(p.id)] as const));
			const jogaveis = ps.filter((p) => (dados.find((d) => d[0] === p.id)?.[2].length ?? 0) > 0);
			setPecas(jogaveis);
			setVistasPorPeca(Object.fromEntries(dados.map(([pid, vs]) => [pid, vs])));
			setHotspotsPorPeca(Object.fromEntries(dados.map(([pid, , hs]) => [pid, hs])));
			setCarregado(true);
		});
	}, [id]);

	const sequencia = pecas.flatMap((p) => (hotspotsPorPeca[p.id] ?? []).map((h) => ({ hotspot: h, pecaId: p.id })));
	const hotspotAtual = sequencia[indiceAtual]?.hotspot ?? null;
	const pecaAtual = pecas.find((p) => p.id === sequencia[indiceAtual]?.pecaId) ?? null;
	const vistas = pecaAtual ? (vistasPorPeca[pecaAtual.id] ?? []) : [];
	const hotspotsDaPeca = pecaAtual ? (hotspotsPorPeca[pecaAtual.id] ?? []) : [];

	useEffect(() => {
		if (!pecaAtual) return;
		getSistemaDaPeca(pecaAtual.sistema_id).then(setSistemaNome);
	}, [pecaAtual]);

	const vistaAtualId = vistaManual && vistaManual.hotspotId === (hotspotAtual?.id ?? null) ? vistaManual.vistaId : hotspotAtual?.imagem_id;
	const vistaAtual = vistas.find((v) => v.id === vistaAtualId) ?? vistas[0] ?? null;

	function handleRespondido(hotspotId: string, resultado: CorrigirRespostaResult) {
		setRespondidos((prev) => new Map(prev).set(hotspotId, resultado));
	}

	if (!quiz || !carregado) return <Loading className="mt-16" />;

	const totalPerguntas = sequencia.length;
	const pendentes = totalPerguntas - respondidos.size;
	const podeAvancar = indiceAtual < totalPerguntas - 1 && hotspotAtual !== null && respondidos.has(hotspotAtual.id);
	const progresso = totalPerguntas > 0 ? (respondidos.size / totalPerguntas) * 100 : 0;
	const hotspotsRespondidos = hotspotsDaPeca.filter((h) => respondidos.has(h.id));
	const resultadoAtual = hotspotAtual ? respondidos.get(hotspotAtual.id) : undefined;
	const labelHotspotAtivo = resultadoAtual ? resultadoAtual.estrutura_correta : "?";

	const pontosGanhos = Array.from(respondidos.values()).reduce((soma, r) => soma + r.pontos, 0);

	async function handleFinalizar() {
		if (pendentes > 0 && !(await confirm(t("quizPlay.confirmarFinalizar", { n: pendentes })))) return;
		navigate(`/quiz/${id}/resultado`, { state: { sessaoId } });
	}

	return (
		<div className="w-full">
			{pecas.length === 0 && <p className="p-8 text-sm text-accent-700/70">{t("quizPlay.semPecas")}</p>}

			{pecas.length > 1 && (
				<div className="flex gap-2 p-4 flex-wrap bg-surface border-b border-divider">
					{pecas.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() =>
								setIndiceAtual(
									Math.max(
										0,
										sequencia.findIndex((x) => x.pecaId === p.id),
									),
								)
							}
							className={`text-sm rounded-full px-4 py-1 ${pecaAtual?.id === p.id ? "bg-accent text-bg" : "bg-bg border border-divider"}`}
						>
							{p.nome}
						</button>
					))}
				</div>
			)}

			{totalPerguntas > 0 && (
				<div className="flex flex-col md:flex-row items-stretch">
					<div className="flex-1 min-w-0 p-6">
						<div className="flex items-end justify-between flex-wrap gap-2 mb-4">
							<div>
								{(sistemaNome || pecaAtual) && (
									<div className="text-[11px] uppercase tracking-wide font-bold text-accent-700/50">
										{[sistemaNome, pecaAtual?.nome].filter(Boolean).join(" · ")}
									</div>
								)}
								<h1 className="text-2xl">{quiz.titulo}</h1>
							</div>
							{hotspotAtual && vistaAtual && (
								<div className="flex gap-2">
									<span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-100 text-accent-800">
										{hotspotAtual.tipo === "regiao" ? t("quizPlay.regiaoDestacada") : t("quizPlay.pontoIndicado")}
									</span>
									<span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-2-100 text-accent-2-800">
										{t("quizPlay.vistaTag", { angulo: t(`angulo.${vistaAtual.angulo}`) })}
									</span>
								</div>
							)}
						</div>

						<PecaViewer
							vistas={vistas}
							vistaAtual={vistaAtual}
							onVistaChange={(v) => setVistaManual({ hotspotId: hotspotAtual?.id ?? null, vistaId: v.id })}
							hotspotAtivo={hotspotAtual}
							hotspotsRespondidos={hotspotsRespondidos}
							labelHotspotAtivo={labelHotspotAtivo}
						/>
					</div>

					<div className="flex-none w-full md:w-[420px] p-6 bg-surface border-t md:border-t-0 md:border-l border-divider flex flex-col">
						<div className="flex items-center justify-between text-xs font-bold text-accent-700/70 mb-2">
							<span>{t("quizPlay.perguntaXdeY", { atual: indiceAtual + 1, total: totalPerguntas })}</span>
							<span className="text-accent-700">{t("quizPlay.pontos", { n: pontosGanhos })}</span>
						</div>
						<div className="h-2 rounded-full bg-neutral-300 overflow-hidden mb-6">
							<div className="h-full bg-accent transition-all" style={{ width: `${progresso}%` }} />
						</div>

						{hotspotAtual && (
							<QuestionPanel
								key={hotspotAtual.id}
								hotspotId={hotspotAtual.id}
								sessaoId={sessaoId}
								resultadoExistente={respondidos.get(hotspotAtual.id)}
								onRespondido={handleRespondido}
							/>
						)}

						<div className="flex flex-col gap-3 mt-auto pt-4">
							<div className="flex items-center justify-between">
								<button
									type="button"
									onClick={() => setIndiceAtual((i) => Math.max(0, i - 1))}
									disabled={indiceAtual === 0}
									className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm disabled:opacity-30"
								>
									{t("quizPlay.anterior")}
								</button>
								<button
									type="button"
									onClick={() => setIndiceAtual((i) => Math.min(totalPerguntas - 1, i + 1))}
									disabled={!podeAvancar}
									className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm disabled:opacity-30"
								>
									{t("quizPlay.proxima")}
								</button>
							</div>
							<button
								type="button"
								onClick={handleFinalizar}
								className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm hover:bg-accent-600"
							>
								{pendentes === 0 ? t("quizPlay.verResultado") : t("quizPlay.finalizar")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
