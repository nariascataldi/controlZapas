if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres@localhost:5432/controlzapas_test?schema=public";
}

const prisma = require('../prisma');

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Solo se pueden ejecutar tests en NODE_ENV=test');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

global.clearDatabase = async () => {
  const models = ['ventaDetalle', 'venta', 'productoImagen', 'variante', 'producto', 'cliente'];
  for (const model of models) {
    try {
      if (prisma[model]?.deleteMany) {
        await prisma[model].deleteMany();
      }
    } catch (e) {
      // Ignore errors in test cleanup
    }
  }
  try {
    await prisma.usuario.deleteMany({ 
      where: { nombre: { not: 'admin' } } 
    });
  } catch (e) {
    // Ignore
  }
};