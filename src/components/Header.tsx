import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-divider bg-surface">
      <span className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-accent inline-block" />
        <span className="font-heading text-lg">AnatoQuiz</span>
      </span>
      {user && (
        <span className="flex items-center gap-4">
          <Link to="/meus-quizzes" className="text-sm text-accent-700 font-semibold">
            Meus quizzes
          </Link>
          <Link to="/quiz/novo" className="text-sm text-accent-700 font-semibold">
            Criar quiz
          </Link>
          <button onClick={handleLogout} className="text-sm text-accent-700 font-semibold">
            Sair
          </button>
        </span>
      )}
    </header>
  );
}
