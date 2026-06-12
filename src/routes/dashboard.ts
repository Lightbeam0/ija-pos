import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [salesData, lowStockCount] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.part.count({
        where: {
          isActive: true,
          quantity: { lte: prisma.part.fields.minQuantity },
        },
      }),
    ]);

    const totalSales = Number(salesData._sum.total || 0);
    const transactionCount = salesData._count;

    res.json({
      date: startOfDay.toISOString().slice(0, 10),
      totalSales: Math.round(totalSales * 100) / 100,
      transactionCount,
      averageTransaction: transactionCount > 0
        ? Math.round((totalSales / transactionCount) * 100) / 100
        : 0,
      lowStockCount,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/dashboard/low-stock
router.get('/low-stock', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lowStockParts = await prisma.part.findMany({
      where: {
        isActive: true,
        quantity: { lte: prisma.part.fields.minQuantity },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        quantity: true,
        minQuantity: true,
        sellingPrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [
        { quantity: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(lowStockParts);
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

export default router;