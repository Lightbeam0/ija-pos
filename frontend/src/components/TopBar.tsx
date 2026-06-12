// frontend/src/components/TopBar.tsx
import { useEffect, useState } from 'react';
import { usePosStore } from '../store/usePosStore';
import { api } from '../lib/api';
import { LogOut } from 'lucide-react';

export default function TopBar() {
  const { user, logout } = usePosStore();
  const [time, setTime] = useState(new Date());
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const data = await api.dashboard.today();
        setLowStockCount(data.lowStockCount);
      } catch {
        // Silently fail
      }
    };

    fetchLowStock();
    const interval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">🏍️ IJA-POS</h1>
        {lowStockCount > 0 && (
          <span className="bg-amber-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
            {lowStockCount} Low Stock
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">
          {time.toLocaleDateString()} {time.toLocaleTimeString()}
        </span>
        <span className="text-gray-300 text-sm">{user?.name}</span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}