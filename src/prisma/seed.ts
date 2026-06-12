// src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in correct order
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.part.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const managerPin = await bcrypt.hash('1234', 10);
  const staffPin = await bcrypt.hash('5678', 10);

  await prisma.user.createMany({
    data: [
      { name: 'Manager', pin: managerPin, role: 'admin' },
      { name: 'Counter Staff', pin: staffPin, role: 'staff' },
    ],
  });

  // Create categories
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Engine Parts', slug: 'engine-parts', sortOrder: 1 },
      { name: 'Brakes', slug: 'brakes', sortOrder: 2 },
      { name: 'Filters & Fluids', slug: 'filters-fluids', sortOrder: 3 },
      { name: 'Chains & Sprockets', slug: 'chains-sprockets', sortOrder: 4 },
      { name: 'Electrical', slug: 'electrical', sortOrder: 5 },
      { name: 'Body & Fairing', slug: 'body-fairing', sortOrder: 6 },
      { name: 'Exhaust', slug: 'exhaust', sortOrder: 7 },
      { name: 'Suspension', slug: 'suspension', sortOrder: 8 },
    ],
  });

  // Create brands
  await prisma.brand.createMany({
    data: [
      { name: 'OEM' },
      { name: 'EBC' },
      { name: 'Brembo' },
      { name: 'DID' },
      { name: 'NGK' },
      { name: 'K&N' },
      { name: 'Motul' },
      { name: 'RK' },
      { name: 'Yuasa' },
    ],
  });

  // Fetch created records for relationships
  const categoryRecords = await prisma.category.findMany();
  const brandRecords = await prisma.brand.findMany();

  const catMap = new Map(categoryRecords.map(c => [c.slug, c.id]));
  const brandMap = new Map(brandRecords.map(b => [b.name, b.id]));

  // Create sample parts
  const parts = [
    {
      sku: 'BP-EBC-FA252',
      name: 'Brake Pads EBC FA252 (Front)',
      description: 'Sintered front brake pads for Yamaha MT-07 2014-2024, XSR700, Ténéré 700',
      brandId: brandMap.get('EBC'),
      categoryId: catMap.get('brakes'),
      costPrice: 22.50,
      sellingPrice: 34.90,
      quantity: 12,
      locationInStore: 'A1-B3',
    },
    {
      sku: 'BP-EBC-FA253',
      name: 'Brake Pads EBC FA253 (Rear)',
      description: 'Organic rear brake pads for Yamaha MT-07, MT-09, XSR900',
      brandId: brandMap.get('EBC'),
      categoryId: catMap.get('brakes'),
      costPrice: 19.80,
      sellingPrice: 29.90,
      quantity: 8,
      locationInStore: 'A1-B4',
    },
    {
      sku: 'OF-KN-204',
      name: 'Oil Filter K&N KN-204',
      description: 'High-performance oil filter for most Japanese motorcycles',
      brandId: brandMap.get('K&N'),
      categoryId: catMap.get('filters-fluids'),
      costPrice: 8.50,
      sellingPrice: 14.90,
      quantity: 25,
      locationInStore: 'B2-A1',
    },
    {
      sku: 'CH-DID-525VX',
      name: 'Chain DID 525VX (120 Links)',
      description: 'X-ring sealed chain, gold, tensile strength 41.3kN',
      brandId: brandMap.get('DID'),
      categoryId: catMap.get('chains-sprockets'),
      costPrice: 65.00,
      sellingPrice: 99.90,
      quantity: 4,
      minQuantity: 2,
      locationInStore: 'C1-A1',
    },
    {
      sku: 'SP-RK-525-15T',
      name: 'Front Sprocket RK 525 15T',
      description: 'Steel front sprocket, 15 tooth, 525 pitch',
      brandId: brandMap.get('RK'),
      categoryId: catMap.get('chains-sprockets'),
      costPrice: 12.00,
      sellingPrice: 22.50,
      quantity: 10,
      locationInStore: 'C1-A2',
    },
    {
      sku: 'SP-NGK-CR8E',
      name: 'Spark Plug NGK CR8E',
      description: 'Standard spark plug, 10mm thread, for various motorcycles',
      brandId: brandMap.get('NGK'),
      categoryId: catMap.get('electrical'),
      costPrice: 4.50,
      sellingPrice: 8.90,
      quantity: 40,
      locationInStore: 'D1-B1',
    },
    {
      sku: 'OIL-MOTUL-5100-10W40',
      name: 'Motul 5100 10W40 4T (1L)',
      description: 'Semi-synthetic engine oil for 4-stroke motorcycles',
      brandId: brandMap.get('Motul'),
      categoryId: catMap.get('filters-fluids'),
      costPrice: 8.90,
      sellingPrice: 15.50,
      quantity: 30,
      locationInStore: 'B2-A3',
    },
    {
      sku: 'BAT-YUASA-YTZ10S',
      name: 'Battery Yuasa YTZ10S',
      description: 'Maintenance-free AGM battery, 12V 8.6Ah',
      brandId: brandMap.get('Yuasa'),
      categoryId: catMap.get('electrical'),
      costPrice: 55.00,
      sellingPrice: 89.90,
      quantity: 3,
      minQuantity: 5,
      locationInStore: 'D1-A1',
    },
    {
      sku: 'BP-OEM-45105ML7680',
      name: 'Front Brake Pad Set OEM Honda',
      description: 'Genuine Honda front brake pads for CBR600RR, CBR1000RR',
      brandId: brandMap.get('OEM'),
      categoryId: catMap.get('brakes'),
      costPrice: 35.00,
      sellingPrice: 52.00,
      quantity: 0,
      minQuantity: 2,
      locationInStore: 'A1-B1',
    },
    {
      sku: 'AF-KN-HA-6001',
      name: 'Air Filter K&N HA-6001',
      description: 'High-flow reusable air filter for various Honda models',
      brandId: brandMap.get('K&N'),
      categoryId: catMap.get('filters-fluids'),
      costPrice: 35.00,
      sellingPrice: 59.90,
      quantity: 6,
      locationInStore: 'B2-A2',
    },
    {
      sku: 'EP-GSK-CBR600',
      name: 'Engine Gasket Kit CBR600RR (07-12)',
      description: 'Complete engine gasket set for Honda CBR600RR 2007-2012',
      brandId: brandMap.get('OEM'),
      categoryId: catMap.get('engine-parts'),
      costPrice: 85.00,
      sellingPrice: 140.00,
      quantity: 1,
      minQuantity: 2,
      locationInStore: 'E1-A1',
    },
    {
      sku: 'EXH-SLP-CBR600',
      name: 'Slip-on Exhaust CBR600RR',
      description: 'Stainless steel slip-on exhaust, includes mounting hardware',
      brandId: brandMap.get('EBC'),
      categoryId: catMap.get('exhaust'),
      costPrice: 180.00,
      sellingPrice: 299.00,
      quantity: 2,
      minQuantity: 1,
      locationInStore: 'F1-A1',
    },
  ];

  for (const part of parts) {
    await prisma.part.create({ data: part });
  }

  console.log('✅ Seed complete!');
  console.log('   Manager login: PIN 1234');
  console.log('   Staff login:   PIN 5678');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });