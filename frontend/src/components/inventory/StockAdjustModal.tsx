// frontend/src/components/inventory/StockAdjustModal.tsx
import { useState } from 'react';
import { api } from '../../lib/api';
import { X, Minus, Plus } from 'lucide-react';

interface StockAdjustModalProps {
  part: {
    id: string;
    sku: string;
    name: string;
    quantity: number;
  };
  onClose: () => void;
  onAdjusted: (newQuantity: number) => void;
}

export default function StockAdjustModal({ part, onClose, onAdjusted }: StockAdjustModalProps) {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const adjustmentNum = parseInt(adjustment) || 0;
  const newQuantity = part.quantity + adjustmentNum;
  const isValid = adjustment.trim() !== '' && adjustmentNum !== 0 && newQuantity >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError('');

    try {
      const result = await api.parts.adjustStock(
        part.id,
        adjustmentNum,
        reason.trim() || undefined
      );
      onAdjusted(result.quantity);
    } catch (error: any) {
      setError(error.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const quickAdjust = (amount: number) => {
    const current = parseInt(adjustment) || 0;
    const newVal = current + amount;
    setAdjustment(newVal.toString());
  };

  const getStockColor = () => {
    if (newQuantity === 0) return 'text-red-400';
    if (newQuantity <= 5) return 'text-amber-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Adjust Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Part Info */}
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-sm font-medium">{part.name}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{part.sku}</p>
          </div>

          {/* Current Stock */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Stock</label>
            <div className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white font-mono text-lg font-semibold">
              {part.quantity} units
            </div>
          </div>

          {/* Adjustment */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Adjustment Amount
              <span className="text-gray-500 ml-1">(positive to add, negative to deduct)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => quickAdjust(-1)}
                className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-red-400 transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center font-mono text-lg focus:outline-none focus:border-blue-500"
                placeholder="0"
                autoFocus
              />
              <button
                type="button"
                onClick={() => quickAdjust(1)}
                className="p-2 bg-gray-700 rounded hover:bg-gray-600 text-green-400 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex gap-2">
            {[1, 5, 10, 25].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setAdjustment(amount.toString())}
                className="flex-1 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors"
              >
                +{amount}
              </button>
            ))}
          </div>

          {/* New Stock Preview */}
          {adjustment.trim() !== '' && adjustmentNum !== 0 && (
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">New Stock</span>
                <span className={`font-mono text-lg font-bold ${getStockColor()}`}>
                  {newQuantity} units
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>Change</span>
                <span className={adjustmentNum > 0 ? 'text-green-400' : 'text-red-400'}>
                  {adjustmentNum > 0 ? '+' : ''}{adjustmentNum} units
                </span>
              </div>
              {newQuantity < 0 && (
                <p className="text-red-400 text-xs mt-2">⚠ Cannot reduce below 0</p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Reason <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Delivery received, manual correction..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}