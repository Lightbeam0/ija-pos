import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [salesData, lowStockItems] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { total: true },
        _count: true,
      }),
      // FIX: prisma.part.fields.minQuantity is a compile-time type helper,
      // not a runtime value. Use $queryRaw to compare two columns directly.
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count
        FROM "Part"
        WHERE "isActive" = true
          AND quantity <= "minQuantity"
      `,
    ]);

    const totalSales      = Number(salesData._sum.total || 0);
    const transactionCount = salesData._count;
    // $queryRaw returns bigint — cast to Number
    const lowStockCount   = Number(lowStockItems[0]?.count ?? 0);

    res.json({
      date: startOfDay.toISOString().slice(0, 10),
      totalSales: Math.round(totalSales * 100) / 100,
      transactionCount,
      averageTransaction:
        transactionCount > 0
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
    // FIX: same issue — use $queryRaw for column-to-column comparison
    const lowStockParts = await prisma.$queryRaw<
      {
        id: string;
        sku: string;
        name: string;
        quantity: number;
        minQuantity: number;
        sellingPrice: number;
        brandName: string | null;
        categoryName: string | null;
      }[]
    >`
      SELECT
        p.id,
        p.sku,
        p.name,
        p.quantity,
        p."minQuantity",
        p."sellingPrice"::float AS "sellingPrice",
        b.name AS "brandName",
        c.name AS "categoryName"
      FROM "Part" p
      LEFT JOIN "Brand"    b ON b.id = p."brandId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE p."isActive" = true
        AND p.quantity <= p."minQuantity"
      ORDER BY p.quantity ASC, p.name ASC
    `;

    // Reshape to match the original response structure
    const result = lowStockParts.map((p) => ({
      id:           p.id,
      sku:          p.sku,
      name:         p.name,
      quantity:     p.quantity,
      minQuantity:  p.minQuantity,
      sellingPrice: p.sellingPrice,
      brand:        p.brandName    ? { name: p.brandName }    : null,
      category:     p.categoryName ? { name: p.categoryName } : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

export default router;
