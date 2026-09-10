import { useI18n } from '../i18n';

export function Loading({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={`flex items-center justify-center gap-2 text-sm text-accent-700/70 ${className}`}>
      <span className="w-4 h-4 rounded-full border-2 border-accent-700/30 border-t-accent-700 animate-spin" />
      {t('comum.carregando')}
    </div>
  );
}
