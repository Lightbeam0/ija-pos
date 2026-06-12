import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /api/users
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, pin, role } = req.body;

    if (!name || !pin || pin.length !== 4) {
      res.status(400).json({ error: 'Name and 4-digit PIN are required' });
      return;
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        name,
        pin: hashedPin,
        role: role || 'staff',
      },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;