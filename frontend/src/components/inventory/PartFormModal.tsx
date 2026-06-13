// frontend/src/components/inventory/PartFormModal.tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { PartDetail, Category, Brand, CreatePartInput } from '../../types';
import { X } from 'lucide-react';

interface PartFormModalProps {
  part?: PartDetail; // undefined = create mode, defined = edit mode
  onClose: () => void;
  onSaved: (part: PartDetail) => void;
}

interface FormErrors {
  sku?: string;
  barcode?: string;
  name?: string;
  costPrice?: string;
  sellingPrice?: string;
  quantity?: string;
  minQuantity?: string;
  general?: string;
}

export default function PartFormModal({ part, onClose, onSaved }: PartFormModalProps) {
  const isEdit = !!part;

  // Form fields
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('5');
  const [locationInStore, setLocationInStore] = useState('');

  // Dropdown data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Inline creation
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch dropdown data
    Promise.all([api.brands.list(), api.categories.list()])
      .then(([brandsData, categoriesData]) => {
        setBrands(brandsData);
        setCategories(categoriesData);
      })
      .catch(console.error);

    // Populate form if editing
    if (part) {
      setSku(part.sku || '');
      setBarcode(part.barcode || '');
      setName(part.name || '');
      setDescription(part.description || '');
      setBrandId(part.brand?.id || '');
      setCategoryId(part.category?.id || '');
      setCostPrice(part.costPrice?.toString() || '');
      setSellingPrice(part.sellingPrice?.toString() || '');
      setQuantity(part.quantity?.toString() || '0');
      setMinQuantity(part.minQuantity?.toString() || '5');
      setLocationInStore(part.locationInStore || '');
    }
  }, [part]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!sku.trim()) newErrors.sku = 'SKU is required';
    if (!name.trim()) newErrors.name = 'Part name is required';

    const costPriceNum = parseFloat(costPrice);
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      newErrors.costPrice = 'Must be ≥ 0';
    }

    const sellingPriceNum = parseFloat(sellingPrice);
    if (isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      newErrors.sellingPrice = 'Must be > 0';
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      newErrors.quantity = 'Must be ≥ 0';
    }

    const minQuantityNum = parseInt(minQuantity);
    if (isNaN(minQuantityNum) || minQuantityNum < 0) {
      newErrors.minQuantity = 'Must be ≥ 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    const data: CreatePartInput = {
      sku: sku.trim(),
      barcode: barcode.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      brandId: brandId || null,
      categoryId: categoryId || null,
      costPrice: parseFloat(costPrice),
      sellingPrice: parseFloat(sellingPrice),
      quantity: parseInt(quantity) || 0,
      minQuantity: parseInt(minQuantity) || 5,
      locationInStore: locationInStore.trim() || null,
    };

    try {
      let savedPart: PartDetail;
      if (isEdit) {
        savedPart = await api.parts.update(part!.id, data);
      } else {
        savedPart = await api.parts.create(data);
      }
      onSaved(savedPart);
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save part' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const brand = await api.brands.create(newBrandName.trim());
      setBrands([...brands, brand]);
      setBrandId(brand.id);
      setNewBrandName('');
      setShowNewBrand(false);
    } catch (error: any) {
      alert(error.message || 'Failed to create brand');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const category = await api.categories.create(newCategoryName.trim());
      setCategories([...categories, category]);
      setCategoryId(category.id);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (error: any) {
      alert(error.message || 'Failed to create category');
    }
  };

  const inputClass = (fieldName: keyof FormErrors) =>
    `w-full px-3 py-2 bg-gray-700 border rounded text-white text-sm focus:outline-none focus:border-blue-500 ${
      errors[fieldName] ? 'border-red-500' : 'border-gray-600'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Part' : 'Add New Part'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={inputClass('sku')}
                placeholder="e.g. BP-EBC-FA252"
              />
              {errors.sku && <p className="text-red-400 text-xs mt-1">{errors.sku}</p>}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className={inputClass('barcode')}
                placeholder="Scan or type barcode"
              />
              {errors.barcode && <p className="text-red-400 text-xs mt-1">{errors.barcode}</p>}
            </div>

            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Part Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass('name')}
                placeholder="e.g. Brake Pads EBC FA252 (Front)"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                placeholder="Optional description..."
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Brand</label>
              {showNewBrand ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="New brand name"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateBrand())}
                  />
                  <button
                    type="button"
                    onClick={handleCreateBrand}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewBrand(false)}
                    className="px-3 py-2 bg-gray-700 text-gray-400 text-sm rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Select Brand —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewBrand(true)}
                    className="px-3 py-2 text-blue-400 text-sm hover:text-blue-300 whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="New category name"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="px-3 py-2 bg-gray-700 text-gray-400 text-sm rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-3 py-2 text-blue-400 text-sm hover:text-blue-300 whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cost Price *</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={inputClass('costPrice')}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.costPrice && <p className="text-red-400 text-xs mt-1">{errors.costPrice}</p>}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Selling Price *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className={inputClass('sellingPrice')}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.sellingPrice && <p className="text-red-400 text-xs mt-1">{errors.sellingPrice}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass('quantity')}
                step="1"
                min="0"
              />
              {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>}
            </div>

            {/* Min Quantity */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Min Quantity (Alert)</label>
              <input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className={inputClass('minQuantity')}
                step="1"
                min="0"
              />
              {errors.minQuantity && <p className="text-red-400 text-xs mt-1">{errors.minQuantity}</p>}
            </div>

            {/* Location */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Location in Store</label>
              <input
                type="text"
                value={locationInStore}
                onChange={(e) => setLocationInStore(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. A1-B3"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Part' : 'Create Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}