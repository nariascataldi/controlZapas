const request = require('supertest');
const app = require('../server');
const db = require('../database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Users API Integration Tests', () => {
  let adminToken;
  let userId;

  beforeAll(async () => {
    await global.clearDatabase();
    
    // Admin para ejecutar las peticiones
    const adminHash = bcrypt.hashSync('admin123', 10);
    await new Promise((resolve) => {
      db.run(`INSERT INTO usuarios (nombre, password_hash, rol) VALUES ('admin_crud', ?, 'ADMIN')`, [adminHash], resolve);
    });
    adminToken = jwt.sign({ id: 1, nombre: 'admin_crud', rol: 'ADMIN' }, process.env.JWT_SECRET);
  });

  describe('POST /api/usuarios', () => {
    test('Should create a new vendedor as Admin', async () => {
      const response = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'vendedor_test',
          password: 'pass123',
          rol: 'VENDEDOR',
          porcentaje_comision: 10
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      userId = response.body.id;
    });

    test('Should fail if name already exists', async () => {
      const response = await request(app)
        .post('/api/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'vendedor_test', password: 'pass' });
      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/usuarios', () => {
    test('Should list all users', async () => {
      const response = await request(app)
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some(u => u.nombre === 'vendedor_test')).toBe(true);
    });
  });

  describe('PUT /api/usuarios/:id', () => {
    test('Should update user commission', async () => {
      const response = await request(app)
        .put(`/api/usuarios/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          nombre: 'vendedor_modificado', 
          rol: 'VENDEDOR', 
          porcentaje_comision: 15 
        });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/usuarios/:id', () => {
    test('Should delete a user', async () => {
      const response = await request(app)
        .delete(`/api/usuarios/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe('Usuario eliminado');
    });

    test('Should not allow deleting self', async () => {
      const response = await request(app)
        .delete('/api/usuarios/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(400);
    });
  });
});
