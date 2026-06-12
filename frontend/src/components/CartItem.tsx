import type { CartItem as CartItemType } from '../types';
import { Minus, Plus, X } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (partId: string, quantity: number) => void;
  onRemove: (partId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-gray-400">{item.sku}</p>
        </div>
        <button onClick={() => onRemove(item.partId)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdateQuantity(item.partId, item.quantity - 1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600">
            <Minus size={12} />
          </button>
          <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
          <button onClick={() => onUpdateQuantity(item.partId, item.quantity + 1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600">
            <Plus size={12} />
          </button>
        </div>
        <span className="text-sm font-semibold text-green-400">${lineTotal.toFixed(2)}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">${item.unitPrice.toFixed(2)} each</p>
    </div>
  );
}