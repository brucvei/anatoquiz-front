import { useNavigate } from 'react-router-dom';
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
    <header className="flex items-center justify-between p-4 border-b">
      <span className="font-semibold">AnatoQuiz</span>
      {user && (
        <button onClick={handleLogout} className="text-sm text-red-600">
          Sair
        </button>
      )}
    </header>
  );
}
