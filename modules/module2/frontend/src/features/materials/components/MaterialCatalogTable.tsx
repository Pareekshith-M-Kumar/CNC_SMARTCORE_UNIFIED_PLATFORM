import React, { useState, useMemo } from 'react';
import { Material } from '../types';
import { RatingPill } from './RatingPill';
import { Search, Filter, Layers, Check } from 'lucide-react';
import { Chip } from '@/components/domain/Chip';

interface MaterialCatalogTableProps {
  materials: Material[];
  selectedMaterialId?: string | null;
  onSelect?: (material: Material) => void;
  isLoading?: boolean;
}

export const MaterialCatalogTable: React.FC<MaterialCatalogTableProps> = ({
  materials,
  selectedMaterialId,
  onSelect,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => set.add(m.category));
    return ['ALL', ...Array.from(set)];
  }, [materials]);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase()) ||
        (m.suitableApplications && m.suitableApplications.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        selectedCategory === 'ALL' || m.category.toUpperCase() === selectedCategory.toUpperCase();

      return matchSearch && matchCat;
    });
  }, [materials, search, selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Controls: Search & Category Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search alloy code, name, or application..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-1 border border-border rounded-md text-text placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-text-muted mr-1 hidden sm:inline" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-full transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-accent text-accent-fg font-semibold'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-surface-3'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-surface-base">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-text-muted font-mono uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Code / Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-right">Density</th>
              <th className="py-2.5 px-3 text-right">kc (N/mm²)</th>
              <th className="py-2.5 px-3 text-right">Vc (m/min)</th>
              <th className="py-2.5 px-3 text-center">Strength</th>
              <th className="py-2.5 px-3 text-center">Machinability</th>
              <th className="py-2.5 px-3 text-right">Cost (₹/kg)</th>
              {onSelect && <th className="py-2.5 px-3 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={onSelect ? 9 : 8} className="py-8 text-center text-text-muted font-mono">
                  Loading material engineering catalog...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={onSelect ? 9 : 8} className="py-8 text-center text-text-muted font-mono">
                  No materials match the filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((mat) => {
                const isSelected = selectedMaterialId === mat.id;
                return (
                  <tr
                    key={mat.id}
                    className={`hover:bg-surface-1 transition-colors ${
                      isSelected ? 'bg-accent/10 border-l-2 border-l-accent' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <div>
                          <div className="font-mono font-bold text-text flex items-center gap-1.5">
                            {mat.code}
                            {isSelected && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-sans px-1.5 py-0.2 bg-accent text-accent-fg rounded-full">
                                <Check className="w-2.5 h-2.5" /> Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted">{mat.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <Chip variant="neutral">{mat.category}</Chip>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text">
                      {mat.densityKgM3.toLocaleString()} <span className="text-[10px] text-text-muted">kg/m³</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text font-semibold">
                      {mat.kcNPerMm2.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text">
                      {mat.vcMinMPerMin}–{mat.vcMaxMPerMin}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RatingPill value={mat.strengthRating} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RatingPill value={mat.machinabilityRating} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-text">
                      ₹ {mat.costPerKg.toFixed(2)}
                    </td>
                    {onSelect && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(mat)}
                          className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                            isSelected
                              ? 'bg-success/20 text-success border border-success/40'
                              : 'bg-surface-2 hover:bg-accent hover:text-accent-fg border border-border text-text'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
