import { useMemo, useState } from 'react';
import type { CustomCategory } from '../../types';

interface CategoryManagerProps {
  categories: CustomCategory[];
  onAddCategory?: (name: string, color: string) => void;
}

export const CategoryManager = ({ categories, onAddCategory }: CategoryManagerProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const preview = useMemo(() => categories.length, [categories.length]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddCategory?.(name, color);
    setName('');
    setColor('#6366f1');
  };

  return (
    <div className="animate-panel rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Categorías del grupo</h3>
          <p className="text-sm text-gray-400">Personaliza etiquetas con color.</p>
        </div>
        <span className="soft-pill rounded-full px-3 py-1 text-sm">{preview} categorías</span>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría" className="input-surface rounded-xl px-3 py-2 text-sm" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#0b0f19] p-1" />
        <button type="button" onClick={handleAdd} className="action-btn rounded-xl px-3 py-2 text-sm font-semibold">Añadir</button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="hover-lift flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b0f19]/60 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm text-white">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color_hex }} />
              {category.name}
            </span>
            <span className="text-xs text-gray-400">{category.color_hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
