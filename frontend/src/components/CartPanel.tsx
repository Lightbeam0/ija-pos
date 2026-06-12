// frontend/src/components/CartPanel.tsx
import { useState } from 'react';
import { usePosStore } from '../store/usePosStore';
import { api } from '../lib/api';
import { ShoppingCart, Trash2 } from 'lucide-react';
import CartItem from './CartItem';

export default function CartPanel() {
  const {
    cart, removeFromCart, updateQuantity, clearCart,
    paymentMethod, setPaymentMethod,
    discountAmount, setDiscountAmount,
    amountTendered, setAmountTendered,
    getSubtotal, getTaxAmount, getTotal, getChangeDue,
    setLastSale, setReceiptOpen,
  } = usePosStore();

  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    
    setCompleting(true);
    setError('');

    try {
      const saleData = {
        items: cart.map(item => ({
          partId: item.partId,
          quantity: item.quantity,
        })),
        discountAmount,
        paymentMethod,
        paymentReceived: paymentMethod === 'cash' ? amountTendered : undefined,
      };

      const sale = await api.sales.create(saleData);
      setLastSale(sale);
      setReceiptOpen(true);
      clearCart();
    } catch (err: any) {
      setError(err.message || 'Failed to complete sale');
    } finally {
      setCompleting(false);
    }
  };

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const total = getTotal();
  const change = getChangeDue();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart size={20} />
          Current Sale
        </h2>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <ShoppingCart size={48} className="mx-auto mb-2 opacity-30" />
            <p>No items in cart</p>
            <p className="text-sm mt-1">Search and add parts to begin</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <CartItem key={item.partId} item={item} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 w-24">Discount $</label>
            <input type="number" min="0" step="0.01" value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-amber-400"><span>Discount</span><span>-${discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-gray-400"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold text-white border-t border-gray-700 pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Payment Method</label>
            <div className="flex gap-2">
              {(['cash', 'card', 'transfer'] as const).map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${paymentMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {method === 'cash' ? '💵' : method === 'card' ? '💳' : '🏦'} {method}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400 w-24">Received $</label>
              <input type="number" min="0" step="0.01" value={amountTendered || ''}
                onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              {change > 0 && <span className="text-green-400 font-bold">Change: ${change.toFixed(2)}</span>}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={handleCompleteSale}
            disabled={completing || (paymentMethod === 'cash' && amountTendered < total)}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg">
            {completing ? 'Processing...' : `Complete Sale • $${total.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}