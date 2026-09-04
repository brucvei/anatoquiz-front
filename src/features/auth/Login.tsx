import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    navigate('/buscar');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-2">Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />

      {erro && <p className="text-accent-700 text-sm">{erro}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-bg font-heading rounded-full px-4 py-2 disabled:opacity-50 hover:bg-accent-600"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <Link to="/cadastro" className="text-sm text-accent font-semibold underline text-center">
        Criar conta
      </Link>
    </form>
  );
}
