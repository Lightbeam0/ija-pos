import { useRef } from 'react';
import { usePosStore } from '../store/usePosStore';
import { useReactToPrint } from 'react-to-print';
import { X, Printer } from 'lucide-react';

export default function ReceiptModal() {
  const { isReceiptOpen, setReceiptOpen, lastSale } = usePosStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${lastSale?.invoiceNumber || 'sale'}`,
  });

  if (!isReceiptOpen || !lastSale) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[400px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Sale Complete ✅</h2>
          <button onClick={() => setReceiptOpen(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div ref={receiptRef} className="bg-white text-black p-6 rounded font-mono text-sm">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">🏍️ IJA-POS</h3>
              <p className="text-xs text-gray-600">Motorcycle Parts</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(lastSale.createdAt).toLocaleString()}</p>
              <p className="text-xs font-bold mt-1">{lastSale.invoiceNumber}</p>
            </div>

            <div className="border-t border-b border-gray-300 py-2 my-2">
              {lastSale.items.map((item, index) => (
                <div key={index} className="flex justify-between text-xs py-0.5">
                  <span className="flex-1">{item.quantity}x {item.name}</span>
                  <span className="ml-2">${item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="text-xs space-y-0.5 mt-2">
              <div className="flex justify-between"><span>Subtotal</span><span>${lastSale.subtotal.toFixed(2)}</span></div>
              {lastSale.discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-${lastSale.discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Tax (8%)</span><span>${lastSale.taxAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1"><span>TOTAL</span><span>${lastSale.total.toFixed(2)}</span></div>
              <div className="flex justify-between mt-1"><span>Payment</span><span className="capitalize">{lastSale.paymentMethod}</span></div>
              {lastSale.paymentReceived && <div className="flex justify-between"><span>Received</span><span>${lastSale.paymentReceived.toFixed(2)}</span></div>}
              {lastSale.changeGiven && lastSale.changeGiven > 0 && <div className="flex justify-between font-bold"><span>Change</span><span>${lastSale.changeGiven.toFixed(2)}</span></div>}
            </div>

            <div className="text-center text-xs text-gray-600 mt-4">
              <p>Served by: {lastSale.staffName}</p>
              <p className="mt-2">Thank you for your purchase!</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button onClick={() => handlePrint()} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={() => setReceiptOpen(false)} className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}