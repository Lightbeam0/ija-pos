import type { Part } from '../types';
import { Plus, Package } from 'lucide-react';

interface PartCardProps {
  part: Part;
  onAdd: () => void;
}

export default function PartCard({ part, onAdd }: PartCardProps) {
  const isOutOfStock = part.quantity === 0;
  const isLowStock = part.quantity > 0 && part.quantity <= 3;

  return (
    <div
      className={`bg-gray-800 rounded-lg p-3 border cursor-pointer transition-colors hover:border-blue-500 ${
        isOutOfStock ? 'border-red-800 opacity-60' : isLowStock ? 'border-amber-700' : 'border-gray-700'
      }`}
      onClick={!isOutOfStock ? onAdd : undefined}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{part.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{part.sku}</p>
          {part.brand && (
            <span className="text-xs text-blue-400">{part.brand.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-green-400">
          ${Number(part.sellingPrice).toFixed(2)}
        </span>
        
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
              <Package size={12} /> Out of Stock
            </span>
          ) : (
            <>
              <span className={`text-xs font-semibold ${isLowStock ? 'text-amber-400' : 'text-gray-400'}`}>
                {part.quantity} in stock
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="p-1 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {part.locationInStore && (
        <p className="text-xs text-gray-500 mt-1">📍 {part.locationInStore}</p>
      )}
    </div>
  );
}