// frontend/src/components/inventory/InventoryScreen.tsx
import { useState } from 'react';
import { usePosStore } from '../../store/usePosStore';
import TopBar from '../TopBar';
import PartsTable from './PartsTable';
import InventoryToolbar from './InventoryToolbar';
import PartFormModal from './PartFormModal';
import StockAdjustModal from './StockAdjustModal';
import type { PartDetail } from '../../types';
import { api } from '../../lib/api';

export default function InventoryScreen() {
  const { user } = usePosStore();
  const isAdmin = user?.role === 'admin';

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Refresh counter for table
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [editingPart, setEditingPart] = useState<PartDetail | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState<PartDetail | null>(null);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Handlers
  const handleAddPart = () => {
    setEditingPart(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (part: PartDetail) => {
    setEditingPart(part);
    setIsFormOpen(true);
  };

  const handleFormSaved = () => {
    setIsFormOpen(false);
    setEditingPart(undefined);
    triggerRefresh();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPart(undefined);
  };

  const handleAdjustStock = (part: PartDetail) => {
    setAdjustingPart(part);
  };

  const handleStockAdjusted = () => {
    setAdjustingPart(null);
    triggerRefresh();
  };

  const handleDeactivate = async (part: PartDetail) => {
    if (!confirm(`Deactivate "${part.name}"? This will hide it from the POS.`)) return;
    try {
      await api.parts.deactivate(part.id);
      triggerRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate part');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <TopBar />

      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <InventoryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          onAddPart={handleAddPart}
          isAdmin={isAdmin}
        />

        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mt-4">
          <PartsTable
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            showInactive={showInactive}
            onEdit={handleEdit}
            onAdjustStock={handleAdjustStock}
            onDeactivate={handleDeactivate}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      {/* Modals */}
      {isFormOpen && (
        <PartFormModal
          part={editingPart}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}

      {adjustingPart && (
        <StockAdjustModal
          part={adjustingPart}
          onClose={() => setAdjustingPart(null)}
          onAdjusted={handleStockAdjusted}
        />
      )}
    </div>
  );
}