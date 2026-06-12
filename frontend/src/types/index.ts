// frontend/src/types/index.ts
export interface User {
  id: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Part {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  locationInStore?: string;
  brand?: { id: string; name: string };
  category?: { id: string; name: string };
}

export interface CartItem {
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentReceived: number | null;
  changeGiven: number | null;
  items: SaleItem[];
  staffName: string;
  notes: string | null;
  createdAt: string;
}

export interface SaleItem {
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DashboardData {
  date: string;
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  lowStockCount: number;
}