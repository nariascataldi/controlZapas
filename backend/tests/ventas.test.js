const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Sales API Integration Tests', () => {
  let adminToken;
  let userToken;
  let varianteId;
  let adminId;
  let vendId;

  beforeAll(async () => {
    await global.clearDatabase();
    
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('vendedor123', 10);
    
    const admin = await prisma.usuario.create({
      data: { nombre: 'admin_v', passwordHash: adminHash, rol: 'ADMIN', porcentajeComision: 0 }
    });
    adminId = admin.id;
    
    const user = await prisma.usuario.create({
      data: { nombre: 'vend_v', passwordHash: userHash, rol: 'VENDEDOR', porcentajeComision: 10 }
    });
    vendId = user.id;

    const producto = await prisma.producto.create({
      data: { nombre: 'Zapa Test', precioMayorista: 50, precioMinorista: 100 }
    });

    const variante = await prisma.variante.create({
      data: { productoId: producto.id, sku: 'SKU-TEST', talla: '42', stockActual: 5, stockMinimo: 1 }
    });
    varianteId = variante.id;

    adminToken = jwt.sign({ id: admin.id, nombre: admin.nombre, rol: admin.rol, porcentajeComision: admin.porcentajeComision }, process.env.JWT_SECRET);
    userToken = jwt.sign({ id: user.id, nombre: user.nombre, rol: user.rol, porcentajeComision: user.porcentajeComision }, process.env.JWT_SECRET);
  });

  describe('POST /api/ventas', () => {
    test('Should register a sale and update stock correctly', async () => {
      const response = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cliente_nombre: 'Cliente Test',
          contacto: '123456',
          total: 200,
          detalles: [
            { variante_id: varianteId, cantidad: 2, precio_unitario: 100 }
          ]
        });

      if (response.status !== 200) console.log('DEBUG sales response:', response.status, response.body);
      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe('Venta registrada exitosamente');

      const variante = await prisma.variante.findUnique({ where: { id: varianteId } });
      expect(variante.stockActual).toBe(3);

      const venta = await prisma.venta.findUnique({ where: { id: response.body.venta_id } });
      expect(venta.comisionCalculada).toBe(20);
    });

    test('Should fail if stock is insufficient', async () => {
      const response = await request(app)
        .post('/api/ventas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cliente_nombre: 'Cliente Sin Stock',
          total: 800,
          detalles: [
            { variante_id: varianteId, cantidad: 10, precio_unitario: 80 }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Stock insuficiente para uno o más artículos');
      
      const variante = await prisma.variante.findUnique({ where: { id: varianteId } });
      expect(variante.stockActual).toBe(3);
    });
  });

  describe('GET /api/ventas', () => {
    test('Admin should see all sales', async () => {
      const response = await request(app)
        .get('/api/ventas')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});
