import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.ts";
import { useAuth } from "../hooks/useAuth.tsx";
import { useI18n } from "../i18n";

const BANDEIRAS = {
	"pt-BR": (
		<svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm" aria-hidden="true">
			<rect width="24" height="16" fill="#009c3b" />
			<polygon points="12,2 22,8 12,14 2,8" fill="#ffdf00" />
			<circle cx="12" cy="8" r="3.2" fill="#002776" />
		</svg>
	),
	es: (
		<svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm" aria-hidden="true">
			<rect width="24" height="8" fill="#ffffff" />
			<rect y="8" width="24" height="8" fill="#d52b1e" />
			<rect width="8" height="8" fill="#0039a6" />
			<polygon points="4,1.6 4.8,3.6 6.9,3.6 5.2,4.8 5.8,6.8 4,5.6 2.2,6.8 2.8,4.8 1.1,3.6 3.2,3.6" fill="#ffffff" />
		</svg>
	),
} as const;

export function Header() {
	const { user } = useAuth();
	const { t, idioma, setIdioma } = useI18n();
	const navigate = useNavigate();
	const location = useLocation();
	const [menuAberto, setMenuAberto] = useState<string | null>(null);
	const menuMobileAberto = menuAberto === location.pathname;

	async function handleLogout() {
		await supabase.auth.signOut();
		navigate("/login");
	}

	const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? "";
	const iniciais = nome
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((parte) => parte[0]?.toUpperCase())
		.join("");

	const links = [
		{ to: "/buscar", label: t("header.buscar") },
		{ to: "/meus-quizzes", label: t("header.meusQuizzes") },
		{ to: "/quiz/novo", label: t("header.criarQuiz") },
		{ to: "/ranking", label: t("header.ranking") },
	];

	const seletorIdioma = (
		<div className="flex items-center gap-1.5">
			{(["pt-BR", "es"] as const).map((id) => (
				<button
					key={id}
					type="button"
					onClick={() => setIdioma(id)}
					title={t(`idiomaQuiz.${id}`)}
					aria-label={t(`idiomaQuiz.${id}`)}
					aria-pressed={idioma === id}
					className={`p-1 rounded-md border-2 ${idioma === id ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}
				>
					{BANDEIRAS[id]}
				</button>
			))}
		</div>
	);

	return (
		<header className="border-b border-divider bg-surface">
			<div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
				<div className="flex items-center gap-6 min-w-0">
					<Link to="/buscar" className="flex items-center gap-2 whitespace-nowrap">
						<img src="/favicon.svg" alt="" className="w-7 h-7 flex-none" />
						<span className="font-heading text-lg">{t("app.brand")}</span>
					</Link>
					{user && (
						<nav className="hidden md:flex items-center gap-4">
							{links.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									className={({ isActive }) => `text-sm whitespace-nowrap ${isActive ? "font-semibold text-accent-700" : "text-ink/60"}`}
								>
									{item.label}
								</NavLink>
							))}
						</nav>
					)}
				</div>

				<div className="hidden md:flex items-center gap-3">
					{seletorIdioma}
					{user && (
						<>
							<span
								title={nome}
								className="w-8 h-8 rounded-full bg-accent-2-300 text-accent-2-900 flex items-center justify-center text-xs font-bold flex-none"
							>
								{iniciais || "?"}
							</span>
							<button type="button" onClick={handleLogout} className="text-sm text-accent-700 font-semibold">
								{t("header.sair")}
							</button>
						</>
					)}
				</div>

				<div className="flex md:hidden items-center gap-3">
					{!user && seletorIdioma}
					{user && (
						<button
							type="button"
							aria-label={t("header.menu")}
							aria-expanded={menuMobileAberto}
							onClick={() => setMenuAberto(menuMobileAberto ? null : location.pathname)}
							className="w-9 h-9 rounded-md border border-divider bg-bg flex flex-col items-center justify-center gap-1"
						>
							<span className="block w-4 h-0.5 bg-ink" />
							<span className="block w-4 h-0.5 bg-ink" />
							<span className="block w-4 h-0.5 bg-ink" />
						</button>
					)}
				</div>
			</div>

			{user && menuMobileAberto && (
				<div className="md:hidden border-t border-divider px-4 py-3 flex flex-col gap-3">
					{links.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }) => `text-sm ${isActive ? "font-semibold text-accent-700" : "text-ink/70"}`}
						>
							{item.label}
						</NavLink>
					))}
					<div className="flex items-center justify-between pt-3 border-t border-divider">
						{seletorIdioma}
						<div className="flex items-center gap-3">
							<span
								title={nome}
								className="w-8 h-8 rounded-full bg-accent-2-300 text-accent-2-900 flex items-center justify-center text-xs font-bold"
							>
								{iniciais || "?"}
							</span>
							<button type="button" onClick={handleLogout} className="text-sm text-accent-700 font-semibold">
								{t("header.sair")}
							</button>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
