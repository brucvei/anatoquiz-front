import { createContext, useContext, useState, type ReactNode } from 'react';
import ptBR from './pt-BR.json';
import es from './es.json';

const dicionarios = { 'pt-BR': ptBR, es } as const;
export type Idioma = keyof typeof dicionarios;

interface I18nContextValue {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  t: (chave: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolar(texto: string, vars?: Record<string, string | number>) {
  if (!vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, chave) => String(vars[chave] ?? ''));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>(() => {
    const salvo = localStorage.getItem('idioma');
    return salvo === 'es' || salvo === 'pt-BR' ? salvo : 'pt-BR';
  });

  function setIdioma(novo: Idioma) {
    localStorage.setItem('idioma', novo);
    setIdiomaState(novo);
  }

  function t(chave: string, vars?: Record<string, string | number>) {
    const dict = dicionarios[idioma] as Record<string, string>;
    const texto = dict[chave] ?? (dicionarios['pt-BR'] as Record<string, string>)[chave] ?? chave;
    return interpolar(texto, vars);
  }

  return <I18nContext.Provider value={{ idioma, setIdioma, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de I18nProvider');
  return ctx;
}
