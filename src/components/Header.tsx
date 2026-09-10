import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';

export function Header() {
  const { user } = useAuth();
  const { t, idioma, setIdioma } = useI18n();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? '';
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-3 border-b border-divider bg-surface">
      <Link to="/buscar" className="flex items-center gap-2 whitespace-nowrap">
        <span className="w-6 h-6 rounded-full bg-accent inline-block flex-none" />
        <span className="font-heading text-lg">{t('app.brand')}</span>
      </Link>
      <span className="flex items-center flex-wrap gap-x-3 gap-y-1">
        {user && (
          <>
            {[
              { to: '/buscar', label: t('header.buscar') },
              { to: '/meus-quizzes', label: t('header.meusQuizzes') },
              { to: '/quiz/novo', label: t('header.criarQuiz') },
              { to: '/ranking', label: t('header.ranking') },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm whitespace-nowrap ${isActive ? 'font-semibold text-accent-700' : 'text-ink/60'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuAberto((v) => !v)}
                className="w-8 h-8 rounded-full bg-accent-2-300 text-accent-2-900 flex items-center justify-center text-xs font-bold flex-none"
              >
                {iniciais || '?'}
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-divider rounded-md shadow-lg py-2 flex flex-col gap-2 z-10">
                  <div className="flex items-center gap-1 text-xs px-3">
                    <button
                      type="button"
                      onClick={() => setIdioma('pt-BR')}
                      className={`px-2 py-0.5 rounded-full ${idioma === 'pt-BR' ? 'bg-accent text-bg' : 'text-accent-700'}`}
                    >
                      PT
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdioma('es')}
                      className={`px-2 py-0.5 rounded-full ${idioma === 'es' ? 'bg-accent text-bg' : 'text-accent-700'}`}
                    >
                      ES
                    </button>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-accent-700 font-semibold text-left px-3 py-1 hover:bg-bg"
                  >
                    {t('header.sair')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </span>
    </header>
  );
}
