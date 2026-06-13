// src/routes/categories.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Helper to auto-generate slug from name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── GET /api/categories ──────────────────────────────────────────────────────
// Available to any authenticated user
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(categories);
  } catch (error) {
    console.error('Categories list error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── POST /api/categories ─────────────────────────────────────────────────────
// Admin only
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Category name is required').max(100),
      sortOrder: z.number().int().min(0).optional().default(0),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid category data', details: validation.error.flatten() });
      return;
    }

    const { name, sortOrder } = validation.data;
    const slug = slugify(name);

    // Check for duplicate name or slug
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (existing) {
      res.status(409).json({ error: 'A category with this name already exists' });
      return;
    }

    const category = await prisma.category.create({
      data: { name, slug, sortOrder },
      select: { id: true, name: true, slug: true, sortOrder: true },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;