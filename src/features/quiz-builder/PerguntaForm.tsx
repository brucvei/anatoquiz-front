import { useEffect, useState } from "react";
import { Loading } from "../../components/Loading.tsx";
import { useI18n } from "../../i18n";
import {
	createAlternativa,
	createPergunta,
	getNomeEstruturaDoHotspot,
	getPerguntaDoHotspot,
	listAlternativas,
	listEstruturas,
	normalizarNome,
	updateAlternativa,
	updatePergunta,
} from "./api.ts";

const TOTAL_DISTRATORES = 3;

interface Campo {
	id: string | null;
	texto: string;
}

const campoVazio = (): Campo => ({ id: null, texto: "" });

interface PerguntaFormProps {
	hotspotId: string;
	onClose: () => void;
}

export function PerguntaForm({ hotspotId, onClose }: PerguntaFormProps) {
	const { t } = useI18n();
	const [perguntaId, setPerguntaId] = useState<string | null>(null);
	const [enunciado, setEnunciado] = useState("");
	const [correta, setCorreta] = useState<Campo>(campoVazio());
	const [distratores, setDistratores] = useState<Campo[]>(() => Array.from({ length: TOTAL_DISTRATORES }, campoVazio));
	const [nomesEstruturas, setNomesEstruturas] = useState<string[]>([]);
	const [carregando, setCarregando] = useState(true);
	const [salvando, setSalvando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);
	const [salvo, setSalvo] = useState(false);

	function erroMensagem(err: unknown): string {
		if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
		return t("perguntaForm.erroSalvar");
	}

	useEffect(() => {
		listEstruturas()
			.then((es) => setNomesEstruturas(es.map((e) => e.nome)))
			.catch(() => setNomesEstruturas([]));
	}, []);

	useEffect(() => {
		let ativo = true;
		setCarregando(true);
		setPerguntaId(null);
		setEnunciado("");
		setCorreta(campoVazio());
		setDistratores(Array.from({ length: TOTAL_DISTRATORES }, campoVazio));
		setSalvo(false);
		setErro(null);
		setAviso(null);
		async function carregar() {
			const nomeEstrutura = await getNomeEstruturaDoHotspot(hotspotId);
			const pergunta = await getPerguntaDoHotspot(hotspotId);
			if (!ativo) return;
			setCorreta({ id: null, texto: nomeEstrutura });
			if (pergunta) {
				setPerguntaId(pergunta.id);
				setEnunciado(pergunta.enunciado);
				const alts = await listAlternativas(pergunta.id);
				if (!ativo) return;
				const certa = alts.find((a) => a.correta);
				const erradas = alts.filter((a) => !a.correta).map((a) => ({ id: a.id, texto: a.texto }));
				if (certa) setCorreta({ id: certa.id, texto: nomeEstrutura });
				while (erradas.length < TOTAL_DISTRATORES) erradas.push(campoVazio());
				setDistratores(erradas.slice(0, TOTAL_DISTRATORES));
			}
			setCarregando(false);
		}
		carregar();
		return () => {
			ativo = false;
		};
	}, [hotspotId]);

	function marcarAlterado() {
		setSalvo(false);
		setErro(null);
		setAviso(null);
	}

	function handleSortear() {
		marcarAlterado();
		const usados = new Set([correta.texto, ...distratores.map((d) => d.texto)].map(normalizarNome));
		const candidatos = [...new Map(nomesEstruturas.map((n) => [normalizarNome(n), n])).entries()]
			.filter(([chave]) => !usados.has(chave))
			.map(([, nome]) => nome);
		for (let i = candidatos.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
		}
		if (candidatos.length === 0) {
			setAviso(t("perguntaForm.semEstruturas"));
			return;
		}
		setDistratores((prev) => prev.map((d) => (d.texto.trim() ? d : { ...d, texto: candidatos.shift() ?? "" })));
	}

	function validar(): string | null {
		if (!enunciado.trim()) return t("perguntaForm.erroSemEnunciado");
		if (!correta.texto.trim()) return t("perguntaForm.erroSemCorreta");
		if (distratores.some((d) => !d.texto.trim())) return t("perguntaForm.erroAlternativaVazia");
		const normalizados = [correta, ...distratores].map((c) => normalizarNome(c.texto));
		if (new Set(normalizados).size !== normalizados.length) return t("perguntaForm.erroDuplicada");
		return null;
	}

	async function handleSalvar() {
		const problema = validar();
		if (problema) {
			setSalvo(false);
			setErro(problema);
			return;
		}
		setErro(null);
		setSalvando(true);
		try {
			let pId = perguntaId;
			if (pId) {
				await updatePergunta(pId, enunciado);
			} else {
				const pergunta = await createPergunta({ hotspot_id: hotspotId, enunciado });
				pId = pergunta.id;
				setPerguntaId(pId);
			}

			const salvarCampo = async (campo: Campo, isCorreta: boolean): Promise<Campo> => {
				const texto = campo.texto.trim();
				if (campo.id) {
					await updateAlternativa(campo.id, { texto, correta: isCorreta });
					return { id: campo.id, texto };
				}
				const criada = await createAlternativa({ pergunta_id: pId, texto, correta: isCorreta });
				return { id: criada.id, texto };
			};

			setCorreta(await salvarCampo(correta, true));
			const novos: Campo[] = [];
			for (const d of distratores) novos.push(await salvarCampo(d, false));
			setDistratores(novos);

			setSalvo(true);
		} catch (err) {
			setErro(erroMensagem(err));
		} finally {
			setSalvando(false);
		}
	}

	if (carregando) {
		return <Loading />;
	}

	return (
		<div className="flex flex-col gap-3">
			<span className="text-[11px] uppercase tracking-wide font-bold text-accent-700/60">{t("perguntaForm.kicker")}</span>
			<h2 className="text-lg font-heading -mt-2">{perguntaId ? t("perguntaForm.editar") : t("perguntaForm.nova")}</h2>

			<textarea
				placeholder={t("perguntaForm.enunciado")}
				value={enunciado}
				onChange={(e) => {
					setEnunciado(e.target.value);
					marcarAlterado();
				}}
				className="bg-bg border border-divider rounded-md px-4 py-2 text-sm min-h-16"
			/>

			<label className="flex flex-col gap-1">
				<span className="text-xs font-bold text-accent-2-800">{t("perguntaForm.correta")}</span>
				<input
					type="text"
					value={correta.texto}
					readOnly
					className="bg-accent-2-100 border-2 border-accent-2-600 rounded-full px-4 py-2 text-sm font-semibold"
				/>
				<span className="text-xs text-accent-700/70">{t("perguntaForm.corretaFixa")}</span>
			</label>

			<div className="flex flex-col gap-2">
				<span className="text-xs font-bold text-accent-700/70">{t("perguntaForm.distratores")}</span>
				{distratores.map((d, i) => (
					<input
						key={i}
						type="text"
						list="estruturas-lista"
						placeholder={t("perguntaForm.distratorN", { n: i + 1 })}
						value={d.texto}
						onChange={(e) => {
							setDistratores((prev) => prev.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)));
							marcarAlterado();
						}}
						className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
					/>
				))}
				<datalist id="estruturas-lista">
					{nomesEstruturas.map((n) => (
						<option key={n} value={n} />
					))}
				</datalist>
				<div className="flex items-center gap-2 flex-wrap">
					<button type="button" onClick={handleSortear} className="bg-bg border border-divider font-heading rounded-full px-3 py-1.5 text-xs">
						{t("perguntaForm.sortear")}
					</button>
					<p className="text-xs text-accent-700/70 flex-1 min-w-40">{t("perguntaForm.dicaDistratores")}</p>
				</div>
				{aviso && <p className="text-xs text-accent-700">{aviso}</p>}
			</div>

			{erro && <div className="p-3 rounded-md text-sm border-2 bg-accent-200 border-accent-700 text-accent-900">{erro}</div>}
			{salvo && !erro && (
				<div className="p-3 rounded-md text-sm border-2 bg-accent-2-200 border-accent-2-600 text-accent-2-900 flex items-center gap-2">
					<span className="font-heading text-base">✓</span> {t("perguntaForm.salvo")}
				</div>
			)}

			<div className="flex gap-2">
				<button
					type="button"
					onClick={handleSalvar}
					disabled={salvando}
					className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm disabled:opacity-50"
				>
					{salvando ? t("perguntaForm.salvando") : t("perguntaForm.salvarPergunta")}
				</button>
				<button type="button" onClick={onClose} className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm">
					{t("comum.fechar")}
				</button>
			</div>
		</div>
	);
}
