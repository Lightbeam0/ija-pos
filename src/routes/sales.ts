import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// FIX: read the correct env var name (TAX_RATE, not DEFAULT_TAX_RATE)
// .env has TAX_RATE=0.12 for Philippine VAT
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.12');

const createSaleSchema = z.object({
  items: z.array(z.object({
    partId:   z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  discountAmount:  z.number().min(0).default(0),
  paymentMethod:   z.enum(['cash', 'card', 'transfer']),
  paymentReceived: z.number().min(0).optional(),
  notes:           z.string().optional(),
});

// FIX: extracted shared serialiser — was copy-pasted in POST and GET /:id
function serializeSale(sale: any) {
  return {
    id:              sale.id,
    invoiceNumber:   sale.invoiceNumber,
    subtotal:        Number(sale.subtotal),
    discountAmount:  Number(sale.discountAmount),
    taxRate:         Number(sale.taxRate),
    taxAmount:       Number(sale.taxAmount),
    total:           Number(sale.total),
    paymentMethod:   sale.paymentMethod,
    paymentReceived: sale.paymentReceived != null ? Number(sale.paymentReceived) : null,
    changeGiven:     sale.changeGiven     != null ? Number(sale.changeGiven)     : null,
    items: sale.items.map((item: any) => ({
      partId:    item.partId,
      sku:       item.part.sku,
      name:      item.part.name,
      quantity:  item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
    })),
    staffName: sale.user.name,
    notes:     sale.notes,
    createdAt: sale.createdAt,
  };
}

const saleInclude = {
  items: {
    include: {
      part: { select: { sku: true, name: true } },
    },
  },
  user: { select: { name: true } },
} as const;

// ─── POST /api/sales ──────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createSaleSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid sale data', details: validation.error.flatten() });
      return;
    }

    const { items, discountAmount, paymentMethod, paymentReceived, notes } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch all parts
      const parts    = await tx.part.findMany({ where: { id: { in: items.map(i => i.partId) }, isActive: true } });
      const partMap  = new Map(parts.map(p => [p.id, p]));

      // 2. Validate stock
      for (const item of items) {
        const part = partMap.get(item.partId);
        if (!part) throw new Error(`Part ${item.partId} not found or inactive`);
        if (part.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${part.name}": have ${part.quantity}, need ${item.quantity}`);
        }
      }

      // 3. Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += Number(partMap.get(item.partId)!.sellingPrice) * item.quantity;
      }

      const taxableAmount = subtotal - discountAmount;
      const taxAmount     = Math.round(taxableAmount * TAX_RATE * 100) / 100;
      const total         = Math.round((taxableAmount + taxAmount) * 100) / 100;

      // 4. Change for cash payments
      let changeGiven: number | null = null;
      if (paymentMethod === 'cash' && paymentReceived != null) {
        if (paymentReceived < total) {
          throw new Error(`Insufficient payment: received ${paymentReceived}, total ${total}`);
        }
        changeGiven = Math.round((paymentReceived - total) * 100) / 100;
      }

      // 5. Generate invoice number (INV-YYYYMMDD-XXXX)
      // NOTE: low-traffic POS — acceptable for Phase 1.
      // For high concurrency add a DB sequence or catch unique violation + retry.
      const today   = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const todayCount = await tx.sale.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt:  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      });
      const invoiceNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;

      // 6. Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          userId:          req.user!.id,
          subtotal,
          discountAmount,
          taxRate:         TAX_RATE,
          taxAmount,
          total,
          paymentMethod,
          paymentReceived: paymentReceived ?? null,
          changeGiven,
          notes:           notes ?? null,
          items: {
            create: items.map(item => ({
              partId:    item.partId,
              quantity:  item.quantity,
              unitPrice: partMap.get(item.partId)!.sellingPrice,
            })),
          },
        },
        include: saleInclude,
      });

      // 7. Deduct stock
      for (const item of items) {
        await tx.part.update({
          where: { id: item.partId },
          data:  { quantity: { decrement: item.quantity }, updatedAt: new Date() },
        });
      }

      return sale;
    });

    res.status(201).json(serializeSale(result));
  } catch (error: any) {
    console.error('Sale creation error:', error);
    if (
      error.message?.includes('not found') ||
      error.message?.includes('Insufficient stock') ||
      error.message?.includes('Insufficient payment')
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create sale' });
    }
  }
});

// ─── GET /api/sales/today/summary ────────────────────────────────────────────
// FIX: must be defined BEFORE /:id or Express captures "today" as the :id param
router.get('/today/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today      = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where:   { createdAt: { gte: startOfDay, lt: endOfDay } },
      select:  { id: true, invoiceNumber: true, total: true, paymentMethod: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);

    res.json({
      date:               startOfDay.toISOString().slice(0, 10),
      totalSales:         Math.round(totalSales * 100) / 100,
      transactionCount:   sales.length,
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

// ─── GET /api/sales/:id ───────────────────────────────────────────────────────
// NOTE: keep below all literal-segment routes (/today/summary)
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sale = await prisma.sale.findUnique({
      where:   { id: req.params.id },
      include: saleInclude,
    });

    if (!sale) { res.status(404).json({ error: 'Sale not found' }); return; }
    res.json(serializeSale(sale));
  } catch (error) {
    console.error('Sale lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

export default router;
