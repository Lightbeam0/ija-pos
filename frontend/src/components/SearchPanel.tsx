import { useEffect, useRef } from 'react';
import { usePosStore } from '../store/usePosStore';
import { api } from '../lib/api';
import { Search, Scan } from 'lucide-react';
import PartCard from './PartCard';

export default function SearchPanel() {
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, addToCart } =
    usePosStore();

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();

    // FIX: clear any pending debounce timer on unmount so the async callback
    // doesn't call setSearchResults after the component is gone
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.parts.search(value);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 200);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      try {
        const part = await api.parts.getByBarcode(searchQuery.trim());
        if (part) {
          addToCart(part);
          setSearchQuery('');
          setSearchResults([]);
        }
      } catch {
        if (searchResults.length === 1) {
          addToCart(searchResults[0]);
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, SKU, or scan barcode..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 text-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {searchResults.length === 0 && searchQuery.length >= 2 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">No parts found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
        {searchResults.length === 0 && searchQuery.length < 2 && (
          <div className="text-center text-gray-500 mt-8">
            <Scan size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-lg">Search or scan a barcode</p>
            <p className="text-sm mt-1">Type at least 2 characters to search</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {searchResults.map((part) => (
            <PartCard key={part.id} part={part} onAdd={() => addToCart(part)} />
          ))}
        </div>
      </div>
    </div>
  );
}
