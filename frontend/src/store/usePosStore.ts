import { create } from 'zustand';
import type { Part, CartItem, Sale } from '../types';

interface PosStore {
  token: string | null;
  user: { id: string; name: string; role: string } | null;
  setAuth: (token: string, user: { id: string; name: string; role: string }) => void;
  logout: () => void;

  cart: CartItem[];
  addToCart: (part: Part) => void;
  removeFromCart: (partId: string) => void;
  updateQuantity: (partId: string, quantity: number) => void;
  clearCart: () => void;

  searchQuery: string;
  searchResults: Part[];
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Part[]) => void;

  paymentMethod: 'cash' | 'card' | 'transfer';
  discountAmount: number;
  amountTendered: number;
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer') => void;
  setDiscountAmount: (amount: number) => void;
  setAmountTendered: (amount: number) => void;

  lastSale: Sale | null;
  isReceiptOpen: boolean;
  setLastSale: (sale: Sale | null) => void;
  setReceiptOpen: (open: boolean) => void;

  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
  getChangeDue: () => number;
}

export const usePosStore = create<PosStore>((set, get) => ({
  token: null,
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, cart: [], lastSale: null });
  },

  cart: [],
  addToCart: (part) => {
    const cart = get().cart;
    const existing = cart.find(item => item.partId === part.id);
    if (existing) {
      set({ cart: cart.map(item => item.partId === part.id ? { ...item, quantity: item.quantity + 1 } : item) });
    } else {
      set({ cart: [...cart, { partId: part.id, sku: part.sku, name: part.name, quantity: 1, unitPrice: part.sellingPrice }] });
    }
  },
  removeFromCart: (partId) => set({ cart: get().cart.filter(item => item.partId !== partId) }),
  updateQuantity: (partId, quantity) => {
    if (quantity <= 0) { set({ cart: get().cart.filter(item => item.partId !== partId) }); return; }
    set({ cart: get().cart.map(item => item.partId === partId ? { ...item, quantity } : item) });
  },
  clearCart: () => set({ cart: [], paymentMethod: 'cash', discountAmount: 0, amountTendered: 0 }),

  searchQuery: '',
  searchResults: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),

  paymentMethod: 'cash',
  discountAmount: 0,
  amountTendered: 0,
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setDiscountAmount: (amount) => set({ discountAmount: amount }),
  setAmountTendered: (amount) => set({ amountTendered: amount }),

  lastSale: null,
  isReceiptOpen: false,
  setLastSale: (sale) => set({ lastSale: sale }),
  setReceiptOpen: (open) => set({ isReceiptOpen: open }),

  getSubtotal: () => get().cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    return Math.round((subtotal - get().discountAmount) * 0.08 * 100) / 100;
  },
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const tax = get().getTaxAmount();
    return Math.round((subtotal - get().discountAmount + tax) * 100) / 100;
  },
  getChangeDue: () => {
    const total = get().getTotal();
    const tendered = get().amountTendered;
    return tendered > total ? Math.round((tendered - total) * 100) / 100 : 0;
  },
}));