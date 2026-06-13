// src/routes/brands.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// ─── GET /api/brands ──────────────────────────────────────────────────────────
// Available to any authenticated user
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(brands);
  } catch (error) {
    console.error('Brands list error:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// ─── POST /api/brands ─────────────────────────────────────────────────────────
// Admin only
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Brand name is required').max(100),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid brand data', details: validation.error.flatten() });
      return;
    }

    const { name } = validation.data;

    // Check for duplicate
    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ error: 'A brand with this name already exists' });
      return;
    }

    const brand = await prisma.brand.create({
      data: { name },
      select: { id: true, name: true },
    });

    res.status(201).json(brand);
  } catch (error) {
    console.error('Brand creation error:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

export default router;