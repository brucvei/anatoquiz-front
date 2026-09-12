import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';

type ConfirmFn = (mensagem: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((msg) => {
    setMensagem(msg);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function responder(v: boolean) {
    setMensagem(null);
    resolverRef.current?.(v);
    resolverRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mensagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50">
          <div className="w-full max-w-sm bg-surface rounded-lg shadow-lg p-6 flex flex-col gap-4">
            <p className="text-sm leading-relaxed">{mensagem}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => responder(false)}
                className="bg-bg border border-divider font-heading rounded-full px-4 py-2 text-sm"
              >
                {t('comum.cancelar')}
              </button>
              <button
                type="button"
                onClick={() => responder(true)}
                autoFocus
                className="bg-accent text-bg font-heading rounded-full px-4 py-2 text-sm"
              >
                {t('comum.confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de ConfirmProvider');
  return ctx;
}
