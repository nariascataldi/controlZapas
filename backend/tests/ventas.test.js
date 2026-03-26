const request = require('supertest');
const app = require('../server');
const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Sales API Integration Tests', () => {
  let adminToken;
  let userToken;
  let varianteId;

  beforeAll(async () => {
    await global.clearDatabase();
    
    // Crear admin, usuario y un producto con stock
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('vendedor123', 10);
    
    await new Promise((resolve) => {
      db.serialize(() => {
        db.run(`INSERT INTO usuarios (nombre, password_hash, rol, porcentaje_comision) VALUES ('admin_v', ?, 'ADMIN', 0)`, [adminHash]);
        db.run(`INSERT INTO usuarios (nombre, password_hash, rol, porcentaje_comision) VALUES ('vend_v', ?, 'VENDEDOR', 10)`, [userHash]);
        db.run(`INSERT INTO productos (nombre, precio_mayorista, precio_minorista) VALUES ('Zapa Test', 50, 100)`, function() {
          db.run(`INSERT INTO variantes (producto_id, sku, talla, stock_actual) VALUES (?, 'SKU-TEST', '42', 5)`, [this.lastID], resolve);
        });
      });
    });

    // Obtener IDs reales
    const adminId = await new Promise(r => db.get("SELECT id FROM usuarios WHERE nombre = 'admin_v'", (e, row) => r(row.id)));
    const vendId = await new Promise(r => db.get("SELECT id FROM usuarios WHERE nombre = 'vend_v'", (e, row) => r(row.id)));

    adminToken = jwt.sign({ id: adminId, nombre: 'admin_v', rol: 'ADMIN' }, process.env.JWT_SECRET);
    userToken = jwt.sign({ id: vendId, nombre: 'vend_v', rol: 'VENDEDOR', porcentaje_comision: 10 }, process.env.JWT_SECRET);
    
    // Obtener varianteId
    varianteId = await new Promise(r => db.get('SELECT id FROM variantes LIMIT 1', (e, row) => r(row.id)));
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

      // Verificar stock final (5 - 2 = 3)
      const variante = await new Promise(r => db.get('SELECT stock_actual FROM variantes WHERE id = ?', [varianteId], (e, row) => r(row)));
      expect(variante.stock_actual).toBe(3);

      // Verificar comisión (200 * 0.10 = 20)
      const venta = await new Promise(r => db.get('SELECT comision_calculada FROM ventas WHERE id = ?', [response.body.venta_id], (e, row) => r(row)));
      expect(venta.comision_calculada).toBe(20);
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
      
      // Verificar que el stock NO cambió (sigue en 3)
      const variante = await new Promise(r => db.get('SELECT stock_actual FROM variantes WHERE id = ?', [varianteId], (e, row) => r(row)));
      expect(variante.stock_actual).toBe(3);
    });
  });

  describe('GET /api/ventas', () => {
    test('Admin should see all sales', async () => {
      const response = await request(app)
        .get('/api/ventas')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
