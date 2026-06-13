// frontend/src/components/inventory/InventoryToolbar.tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Category } from '../../types';
import { Search, Plus, Filter } from 'lucide-react';

interface InventoryToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string;
  onCategoryChange: (categoryId: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
  onAddPart: () => void;
  isAdmin: boolean;
}

export default function InventoryToolbar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  showInactive,
  onShowInactiveChange,
  onAddPart,
  isAdmin,
}: InventoryToolbarProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories.list()
      .then(setCategories)
      .catch(console.error);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by SKU, name, or barcode..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Show Inactive Toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => onShowInactiveChange(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          Show inactive
        </label>

        {/* Add Part Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={onAddPart}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={18} />
            Add Part
          </button>
        )}
      </div>
    </div>
  );
}