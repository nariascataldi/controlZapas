const request = require('supertest');
const app = require('../server');
const prisma = require('../prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Products API Integration Tests', () => {
  let adminToken;
  let userToken;
  let productoId;
  let varianteId;

  beforeAll(async () => {
    await global.clearDatabase();
    
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);
    
    const admin = await prisma.usuario.create({
      data: { nombre: 'admin_test', passwordHash: adminHash, rol: 'ADMIN', porcentajeComision: 0 }
    });
    
    const user = await prisma.usuario.create({
      data: { nombre: 'user_test', passwordHash: userHash, rol: 'VENDEDOR', porcentajeComision: 5 }
    });

    adminToken = jwt.sign({ id: admin.id, nombre: admin.nombre, rol: admin.rol, porcentajeComision: admin.porcentajeComision }, process.env.JWT_SECRET);
    userToken = jwt.sign({ id: user.id, nombre: user.nombre, rol: user.rol, porcentajeComision: user.porcentajeComision }, process.env.JWT_SECRET);
  });

  describe('POST /api/productos', () => {
    test('Should create a product with variants as Admin', async () => {
      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Zapatilla Running X',
          marca: 'Zapas Brand',
          precio_mayorista: 50,
          precio_minorista: 100,
          categoria: 'Deporte',
          variantes: [
            { sku: 'ZRX-40-B', color: 'Blanco', talla: '40', stock_actual: 10, stock_minimo: 2 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      productoId = response.body.id;
    });

    test('Should fail to create product as Vendedor', async () => {
      const response = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ nombre: 'X' });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/productos', () => {
    test('Should list products', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      varianteId = response.body[0].variante_id;
    });
  });

  describe('PUT /api/productos/variantes/:id/stock', () => {
    test('Should update stock as Admin', async () => {
      const response = await request(app)
        .put(`/api/productos/variantes/${varianteId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock_actual: 20 });
      
      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe('Stock actualizado correctamente');
    });
  });

  describe('GET /api/productos/buscar', () => {
    test('Should find product by name', async () => {
      const response = await request(app)
        .get('/api/productos/buscar')
        .query({ q: 'Running' })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.some(p => p.nombre && p.nombre.includes('Running'))).toBe(true);
    });
  });

  describe('GET /api/productos/:id', () => {
    test('Should return product details', async () => {
      const response = await request(app)
        .get(`/api/productos/${productoId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.nombre).toBe('Zapatilla Running X');
    });

    test('Should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/productos/999')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(404);
    });
  });
});
