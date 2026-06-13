import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// NOTE: authenticateToken is applied globally in index.ts — removed from here
// to avoid double-application. requireAdmin is used for write operations.

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
// FIX: guarded by requireAdmin — staff cannot create new users
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, pin, role } = req.body;

    if (!name || !pin || String(pin).length !== 4) {
      res.status(400).json({ error: 'Name and 4-digit PIN are required' });
      return;
    }

    const hashedPin = await bcrypt.hash(String(pin), 10);

    const user = await prisma.user.create({
      data:   { name, pin: hashedPin, role: role || 'staff' },
      select: { id: true, name: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
