// src/routes/sales.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schema
const createSaleSchema = z.object({
  items: z.array(z.object({
    partId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  discountAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  paymentReceived: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const DEFAULT_TAX_RATE = parseFloat(process.env.DEFAULT_TAX_RATE || '0.08');

// POST /api/sales
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createSaleSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        error: 'Invalid sale data', 
        details: validation.error.flatten() 
      });
      return;
    }

    const { items, discountAmount, paymentMethod, paymentReceived, notes } = validation.data;

    // Process sale in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch all parts and lock rows
      const partIds = items.map(item => item.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: partIds }, isActive: true },
      });

      // Create lookup map
      const partMap = new Map(parts.map(p => [p.id, p]));

      // 2. Validate all parts exist and have stock
      for (const item of items) {
        const part = partMap.get(item.partId);
        if (!part) {
          throw new Error(`Part ${item.partId} not found or inactive`);
        }
        if (part.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${part.name}": have ${part.quantity}, need ${item.quantity}`);
        }
      }

      // 3. Calculate totals
      let subtotal = 0;
      for (const item of items) {
        const part = partMap.get(item.partId)!;
        const lineTotal = Number(part.sellingPrice) * item.quantity;
        subtotal += lineTotal;
      }

      const discount = discountAmount;
      const taxableAmount = subtotal - discount;
      const taxAmount = Math.round(taxableAmount * DEFAULT_TAX_RATE * 100) / 100;
      const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

      // 4. Calculate change for cash payments
      let changeGiven: number | null = null;
      if (paymentMethod === 'cash' && paymentReceived) {
        if (paymentReceived < total) {
          throw new Error(`Insufficient payment: received ${paymentReceived}, total ${total}`);
        }
        changeGiven = Math.round((paymentReceived - total) * 100) / 100;
      }

      // 5. Generate invoice number (INV-YYYYMMDD-XXXX)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      const todaySalesCount = await tx.sale.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      });

      const invoiceNumber = `INV-${dateStr}-${String(todaySalesCount + 1).padStart(4, '0')}`;

      // 6. Create sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          userId: req.user!.id,
          subtotal,
          discountAmount: discount,
          taxRate: DEFAULT_TAX_RATE,
          taxAmount,
          total,
          paymentMethod,
          paymentReceived: paymentReceived || null,
          changeGiven,
          notes: notes || null,
          items: {
            create: items.map(item => {
              const part = partMap.get(item.partId)!;
              return {
                partId: item.partId,
                quantity: item.quantity,
                unitPrice: part.sellingPrice,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              part: {
                select: { sku: true, name: true },
              },
            },
          },
          user: {
            select: { name: true },
          },
        },
      });

      // 7. Deduct stock
      for (const item of items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { 
            quantity: { decrement: item.quantity },
            updatedAt: new Date(),
          },
        });
      }

      return sale;
    });

    // Format response
    const response = {
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      subtotal: Number(result.subtotal),
      discountAmount: Number(result.discountAmount),
      taxRate: Number(result.taxRate),
      taxAmount: Number(result.taxAmount),
      total: Number(result.total),
      paymentMethod: result.paymentMethod,
      paymentReceived: result.paymentReceived ? Number(result.paymentReceived) : null,
      changeGiven: result.changeGiven ? Number(result.changeGiven) : null,
      items: result.items.map(item => ({
        partId: item.partId,
        sku: item.part.sku,
        name: item.part.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.unitPrice) * item.quantity,
      })),
      staffName: result.user.name,
      notes: result.notes,
      createdAt: result.createdAt,
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Sale creation error:', error);
    
    // Determine if it's a validation error or server error
    if (error.message?.includes('not found') || 
        error.message?.includes('Insufficient stock') ||
        error.message?.includes('Insufficient payment')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create sale' });
    }
  }
});

// GET /api/sales/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            part: {
              select: { sku: true, name: true },
            },
          },
        },
        user: {
          select: { name: true },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const response = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discountAmount),
      taxRate: Number(sale.taxRate),
      taxAmount: Number(sale.taxAmount),
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      paymentReceived: sale.paymentReceived ? Number(sale.paymentReceived) : null,
      changeGiven: sale.changeGiven ? Number(sale.changeGiven) : null,
      items: sale.items.map(item => ({
        partId: item.partId,
        sku: item.part.sku,
        name: item.part.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.unitPrice) * item.quantity,
      })),
      staffName: sale.user.name,
      notes: sale.notes,
      createdAt: sale.createdAt,
    };

    res.json(response);
  } catch (error) {
    console.error('Sale lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// GET /api/sales/today
router.get('/today/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);

    res.json({
      date: startOfDay.toISOString().slice(0, 10),
      totalSales: Math.round(totalSales * 100) / 100,
      transactionCount: sales.length,
      averageTransaction: sales.length > 0 
        ? Math.round((totalSales / sales.length) * 100) / 100 
        : 0,
      sales,
    });
  } catch (error) {
    console.error('Today summary error:', error);
    res.status(500).json({ error: 'Failed to fetch today summary' });
  }
});

export default router;