// frontend/src/components/inventory/PartsTable.tsx
import { useState, useEffect, useCallback } from 'react';
import { usePosStore } from '../../store/usePosStore';
import { api } from '../../lib/api';
import type { PartDetail } from '../../types';
import { ChevronLeft, ChevronRight, Edit, Minus, Plus, X } from 'lucide-react';

interface PartsTableProps {
  searchQuery: string;
  categoryFilter: string;
  showInactive: boolean;
  onEdit: (part: PartDetail) => void;
  onAdjustStock: (part: PartDetail) => void;
  onDeactivate: (part: PartDetail) => void;
  refreshKey: number;
}

export default function PartsTable({
  searchQuery,
  categoryFilter,
  showInactive,
  onEdit,
  onAdjustStock,
  onDeactivate,
  refreshKey,
}: PartsTableProps) {
  const { user } = usePosStore();
  const isAdmin = user?.role === 'admin';

  const [parts, setParts] = useState<PartDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.parts.list(page, limit, showInactive);
      setParts(data.parts);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch parts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, showInactive, refreshKey]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Client-side filtering
  const filteredParts = parts.filter((part) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        part.sku.toLowerCase().includes(q) ||
        part.name.toLowerCase().includes(q) ||
        part.barcode?.toLowerCase().includes(q) ||
        part.brand?.name.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (categoryFilter && part.category?.id !== categoryFilter) {
      return false;
    }

    return true;
  });

  const getRowClasses = (part: PartDetail) => {
    if (!part.isActive) return 'bg-gray-800/50 text-gray-500';
    if (part.quantity === 0) return 'bg-red-900/20 border-l-2 border-red-500';
    if (part.quantity <= part.minQuantity) return 'bg-amber-900/20 border-l-2 border-amber-500';
    return 'hover:bg-gray-700/50';
  };

  const getStockBadge = (part: PartDetail) => {
    if (!part.isActive) {
      return <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">Inactive</span>;
    }
    if (part.quantity === 0) {
      return <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400 font-semibold">Out of Stock</span>;
    }
    if (part.quantity <= part.minQuantity) {
      return <span className="text-xs px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 font-semibold">Low Stock</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">In Stock</span>;
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value == null) return '$—';
    return `$${Number(value).toFixed(2)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading parts...</div>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">No parts found</p>
              <p className="text-sm mt-1">
                {searchQuery || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Add your first part to get started'}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">SKU</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium hidden lg:table-cell">Brand</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium hidden md:table-cell">Category</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium hidden md:table-cell">Cost</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Sell Price</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Stock</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium hidden lg:table-cell">Min</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium hidden xl:table-cell">Location</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                {isAdmin && (
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr key={part.id} className={`border-b border-gray-700/50 transition-colors ${getRowClasses(part)}`}>
                  <td className="py-2.5 px-4 font-mono text-xs">{part.sku}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium">{part.name}</div>
                    {part.barcode && (
                      <div className="text-xs text-gray-500 font-mono">{part.barcode}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 hidden lg:table-cell text-gray-300">
                    {part.brand?.name || '—'}
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell text-gray-300">
                    {part.category?.name || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono hidden md:table-cell text-gray-300">
                    {formatCurrency(part.costPrice)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-green-400">
                    {formatCurrency(part.sellingPrice)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`font-mono font-semibold ${
                      part.quantity === 0 ? 'text-red-400' :
                      part.quantity <= part.minQuantity ? 'text-amber-400' :
                      'text-white'
                    }`}>
                      {part.quantity}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono hidden lg:table-cell text-gray-400">
                    {part.minQuantity ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-xs hidden xl:table-cell text-gray-400">
                    {part.locationInStore || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {getStockBadge(part)}
                  </td>
                  {isAdmin && (
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(part)}
                          className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                          title="Edit part"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onAdjustStock(part)}
                          className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Adjust stock"
                        >
                          <Plus size={14} />
                        </button>
                        {part.isActive && (
                          <button
                            onClick={() => onDeactivate(part)}
                            className="p-1.5 rounded hover:bg-gray-600 text-gray-400 hover:text-red-400 transition-colors"
                            title="Deactivate part"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} parts
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-gray-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}