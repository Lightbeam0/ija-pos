import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      res.status(400).json({ error: 'PIN must be 4 digits' });
      return;
    }

    // Find all active users (PIN comparison done in-memory for speed)
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, pin: true, role: true },
    });

    // Compare PINs
    let matchedUser = null;
    for (const user of users) {
      const valid = await bcrypt.compare(pin, user.pin);
      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: matchedUser.id, name: matchedUser.name, role: matchedUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Verify token and get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response): void => {
  // JWT is stateless — client just discards the token
  res.json({ message: 'Logged out successfully' });
});

export default router;