// src/routes/parts.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// ─── Serialization Helper ─────────────────────────────────────────────────────
function serializePart(part: any): any {
  if (!part) return part;
  if (Array.isArray(part)) return part.map(serializePart);
  return {
    ...part,
    sellingPrice: part.sellingPrice != null ? Number(part.sellingPrice) : part.sellingPrice,
    costPrice:    part.costPrice    != null ? Number(part.costPrice)    : part.costPrice,
  };
}

// ─── Validation Schemas ───────────────────────────────────────────────────────
const createPartSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Part name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  costPrice: z.number().min(0, 'Cost price must be ≥ 0'),
  sellingPrice: z.number().positive('Selling price must be > 0'),
  quantity: z.number().int().min(0).optional().default(0),
  minQuantity: z.number().int().min(0).optional().default(5),
  locationInStore: z.string().max(50).optional().nullable(),
});

const updatePartSchema = createPartSchema.partial();

const stockAdjustSchema = z.object({
  adjustment: z.number().int(),
  reason: z.string().max(500).optional(),
});

// ─── GET /api/parts/search?q=term ─────────────────────────────────────────────
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const searchTerm = (req.query.q as string)?.trim();
    if (!searchTerm) { res.json([]); return; }

    const parts = await prisma.part.findMany({
      where: {
        isActive: true,
        OR: [
          { sku:         { contains: searchTerm, mode: 'insensitive' } },
          { barcode:     { contains: searchTerm, mode: 'insensitive' } },
          { name:        { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, sku: true, barcode: true, name: true,
        sellingPrice: true, quantity: true, locationInStore: true,
        brand:    { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: [{ quantity: 'desc' }, { name: 'asc' }],
    });

    res.json(serializePart(parts));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── GET /api/parts/barcode/:code ─────────────────────────────────────────────
router.get('/barcode/:code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await prisma.part.findFirst({
      where: {
        isActive: true,
        OR: [{ barcode: req.params.code }, { sku: req.params.code }],
      },
      select: {
        id: true, sku: true, barcode: true, name: true, description: true,
        sellingPrice: true, costPrice: true, quantity: true,
        minQuantity: true, locationInStore: true, isActive: true,
        brand:    { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!part) { res.status(404).json({ error: 'Part not found' }); return; }
    res.json(serializePart(part));
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// ─── GET /api/parts/category/:categoryId ──────────────────────────────────────
router.get('/category/:categoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip  = (page - 1) * limit;

    const where = { isActive: true, categoryId };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          id: true, sku: true, name: true,
          sellingPrice: true, quantity: true, locationInStore: true,
          brand:    { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.part.count({ where }),
    ]);

    res.json({
      parts: serializePart(parts),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Category parts error:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// ─── GET /api/parts ───────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip  = (page - 1) * limit;
    const where = { isActive: true };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          id: true, sku: true, name: true,
          sellingPrice: true, quantity: true, locationInStore: true,
          brand:    { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.part.count({ where }),
    ]);

    res.json({
      parts: serializePart(parts),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Parts list error:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// ─── POST /api/parts ──────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createPartSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid part data', details: validation.error.flatten() });
      return;
    }

    const data = validation.data;

    // Check unique SKU
    const existingSku = await prisma.part.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      res.status(409).json({ error: 'A part with this SKU already exists' });
      return;
    }

    // Check unique barcode if provided
    if (data.barcode) {
      const existingBarcode = await prisma.part.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) {
        res.status(409).json({ error: 'A part with this barcode already exists' });
        return;
      }
    }

    const part = await prisma.part.create({
      data: {
        sku: data.sku,
        barcode: data.barcode ?? null,
        name: data.name,
        description: data.description ?? null,
        brandId: data.brandId ?? null,
        categoryId: data.categoryId ?? null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        locationInStore: data.locationInStore ?? null,
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(serializePart(part));
  } catch (error: any) {
    console.error('Part creation error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Duplicate entry detected' });
    } else {
      res.status(500).json({ error: 'Failed to create part' });
    }
  }
});

// ─── GET /api/parts/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await prisma.part.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, sku: true, barcode: true, name: true, description: true,
        sellingPrice: true, costPrice: true, quantity: true,
        minQuantity: true, locationInStore: true,
        brand:    { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!part) { res.status(404).json({ error: 'Part not found' }); return; }
    res.json(serializePart(part));
  } catch (error) {
    console.error('Part detail error:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// ─── PUT /api/parts/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check part exists
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }

    const validation = updatePartSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid part data', details: validation.error.flatten() });
      return;
    }

    const data = validation.data;

    // Check unique SKU (exclude current part)
    if (data.sku) {
      const existingSku = await prisma.part.findFirst({
        where: { sku: data.sku, id: { not: id } },
      });
      if (existingSku) {
        res.status(409).json({ error: 'A part with this SKU already exists' });
        return;
      }
    }

    // Check unique barcode if provided
    if (data.barcode) {
      const existingBarcode = await prisma.part.findFirst({
        where: { barcode: data.barcode, id: { not: id } },
      });
      if (existingBarcode) {
        res.status(409).json({ error: 'A part with this barcode already exists' });
        return;
      }
    }

    const part = await prisma.part.update({
      where: { id },
      data: {
        sku: data.sku,
        barcode: data.barcode ?? undefined,
        name: data.name,
        description: data.description ?? undefined,
        brandId: data.brandId ?? undefined,
        categoryId: data.categoryId ?? undefined,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        locationInStore: data.locationInStore ?? undefined,
      },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    res.json(serializePart(part));
  } catch (error: any) {
    console.error('Part update error:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Duplicate entry detected' });
    } else {
      res.status(500).json({ error: 'Failed to update part' });
    }
  }
});

// ─── PATCH /api/parts/:id/stock ───────────────────────────────────────────────
router.patch('/:id/stock', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const validation = stockAdjustSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid adjustment data', details: validation.error.flatten() });
      return;
    }

    const { adjustment, reason } = validation.data;

    // Use transaction to prevent race conditions and ensure non-negative stock
    const updatedPart = await prisma.$transaction(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id },
        select: { id: true, sku: true, name: true, quantity: true },
      });

      if (!part) {
        throw new Error('Part not found');
      }

      const newQuantity = part.quantity + adjustment;
      if (newQuantity < 0) {
        throw new Error(`Insufficient stock. Current: ${part.quantity}, Requested adjustment: ${adjustment}`);
      }

      return tx.part.update({
        where: { id },
        data: { 
          quantity: newQuantity,
          updatedAt: new Date() 
        },
      });
    });

    // TODO: Persist 'reason' to a StockMovement audit table here
    
    res.json({
      id: updatedPart.id,
      sku: updatedPart.sku,
      name: updatedPart.name,
      quantity: updatedPart.quantity,
    });
  } catch (error: any) {
    console.error('Stock adjustment error:', error);
    if (error.message.includes('Insufficient stock')) {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Part not found') {
      res.status(404).json({ error: 'Part not found' });
    } else {
      res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }
});

// ─── DELETE /api/parts/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }

    await prisma.part.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    res.json({ message: 'Part deactivated' });
  } catch (error) {
    console.error('Part deactivation error:', error);
    res.status(500).json({ error: 'Failed to deactivate part' });
  }
});

export default router;
