import { usePosStore } from '../store/usePosStore';
import TopBar from './TopBar';
import SearchPanel from './SearchPanel';
import CartPanel from './CartPanel';
import ReceiptModal from './ReceiptModal';

export default function PosScreen() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Search & Results */}
        <div className="w-[60%] border-r border-gray-700 flex flex-col">
          <SearchPanel />
        </div>

        {/* Right: Cart & Payment */}
        <div className="w-[40%] flex flex-col">
          <CartPanel />
        </div>
      </div>

      <ReceiptModal />
    </div>
  );
}