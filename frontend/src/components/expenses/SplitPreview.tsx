import type { ExpenseSplit, SplitType } from '../../types';

interface SplitPreviewProps {
  amount: number;
  mode: SplitType;
  splits: ExpenseSplit[];
}

export const SplitPreview = ({ amount, mode, splits }: SplitPreviewProps) => {
  if (splits.length === 0) return null;

  const total = splits.reduce((sum, split) => sum + split.split_value, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
      <p className="mb-2 font-medium text-white">Vista previa</p>
      <div className="space-y-1">
        {splits.map((split) => (
          <div key={split.user_id} className="flex items-center justify-between">
            <span>{split.user_id}</span>
            <span className="text-indigo-400">
              {mode === 'PERCENTAGE' ? `${split.split_value}%` : mode === 'EXACT' ? `${split.split_value.toFixed(2)}€` : `${split.split_value}`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-white/10 pt-2 text-xs text-gray-400">
        {mode === 'EXACT' && <span>Total exacto: {total.toFixed(2)}€</span>}
        {mode === 'PERCENTAGE' && <span>Total porcentajes: {total}%</span>}
        {mode === 'SHARES' && <span>Total partes: {total}</span>}
        {mode === 'EQUAL' && <span>Reparto igualitario sobre {amount.toFixed(2)}€</span>}
      </div>
    </div>
  );
};
