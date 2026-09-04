import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export function SignUp() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso(true);
  }

  if (sucesso) {
    return (
      <div className="max-w-sm mx-auto mt-16 p-8 text-center bg-surface rounded-lg shadow-lg">
        <p>Cadastro feito. Confirma o email antes de entrar (se a confirmação estiver ativa no projeto).</p>
        <Link to="/login" className="text-accent font-semibold underline mt-4 inline-block">
          Ir para login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-2">Cadastro</h1>

      <input
        type="text"
        placeholder="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />
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
        minLength={6}
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />

      {erro && <p className="text-accent-700 text-sm">{erro}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-bg font-heading rounded-full px-4 py-2 disabled:opacity-50 hover:bg-accent-600"
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>

      <Link to="/login" className="text-sm text-accent font-semibold underline text-center">
        Já tenho conta
      </Link>
    </form>
  );
}
