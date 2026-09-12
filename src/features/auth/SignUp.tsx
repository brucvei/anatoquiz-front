import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useI18n } from '../../i18n';

export function SignUp() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    navigate(data.session ? '/buscar' : '/login');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 flex flex-col gap-4 p-8 bg-surface rounded-lg shadow-lg">
      <h1 className="text-2xl mb-2">{t('auth.cadastro.titulo')}</h1>

      <input
        type="text"
        placeholder={t('campo.nome')}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />
      <input
        type="email"
        placeholder={t('campo.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-bg border border-divider rounded-full px-4 py-2 text-sm"
      />
      <input
        type="password"
        placeholder={t('campo.senha')}
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
        {loading ? t('auth.cadastro.cadastrando') : t('auth.cadastro.cadastrar')}
      </button>

      <Link
        to="/login"
        className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm text-center"
      >
        {t('auth.cadastro.jaTenhoConta')}
      </Link>
    </form>
  );
}
