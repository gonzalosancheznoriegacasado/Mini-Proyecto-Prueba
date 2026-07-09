import type { SplitType } from '../../types';

interface SplitTypeSelectorProps {
  value: SplitType;
  onChange: (value: SplitType) => void;
}

const options: Array<{ value: SplitType; label: string }> = [
  { value: 'EQUAL', label: 'Igual' },
  { value: 'EXACT', label: 'Exacto' },
  { value: 'PERCENTAGE', label: 'Porcentaje' },
  { value: 'SHARES', label: 'Partes' },
];

export const SplitTypeSelector = ({ value, onChange }: SplitTypeSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 text-sm transition ${value === option.value ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
