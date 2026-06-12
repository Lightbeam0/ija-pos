// src/routes/parts.ts
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to serialize Decimal fields to numbers
function serializePart(part: any) {
  if (!part) return part;
  if (Array.isArray(part)) return part.map(serializePart);
  
  return {
    ...part,
    sellingPrice: part.sellingPrice ? Number(part.sellingPrice) : part.sellingPrice,
    costPrice: part.costPrice ? Number(part.costPrice) : part.costPrice,
  };
}

// GET /api/parts/search?q=brake+pad
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const searchTerm = (q as string)?.trim();

    if (!searchTerm) {
      res.json([]);
      return;
    }

    const parts = await prisma.part.findMany({
      where: {
        isActive: true,
        OR: [
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { barcode: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        sellingPrice: true,
        quantity: true,
        locationInStore: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: [
        { quantity: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json(serializePart(parts));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/parts/barcode/:code
router.get('/barcode/:code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const part = await prisma.part.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: code },
          { sku: code },
        ],
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        sellingPrice: true,
        quantity: true,
        locationInStore: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!part) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }

    res.json(serializePart(part));
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// GET /api/parts/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await prisma.part.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        description: true,
        sellingPrice: true,
        costPrice: true,
        quantity: true,
        minQuantity: true,
        locationInStore: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!part) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }

    res.json(serializePart(part));
  } catch (error) {
    console.error('Part detail error:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// GET /api/parts/category/:categoryId
router.get('/category/:categoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      categoryId: categoryId,
    };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          sellingPrice: true,
          quantity: true,
          locationInStore: true,
          brand: { select: { id: true, name: true } },
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

// GET /api/parts
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          sellingPrice: true,
          quantity: true,
          locationInStore: true,
          brand: { select: { id: true, name: true } },
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

export default router;