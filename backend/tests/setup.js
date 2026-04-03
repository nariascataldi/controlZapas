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
  await prisma.$transaction([
    prisma.ventaDetalle.deleteMany(),
    prisma.venta.deleteMany(),
    prisma.productoImagen.deleteMany(),
    prisma.variante.deleteMany(),
    prisma.producto.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.usuario.deleteMany({ where: { nombre: { not: 'admin' } } })
  ]);
};
