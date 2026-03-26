const request = require('supertest');
const app = require('../server');
const db = require('../database');
const bcrypt = require('bcrypt');

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    await global.clearDatabase();
    
    // Crear un usuario de prueba
    const hash = bcrypt.hashSync('testpass', 10);
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO usuarios (nombre, password_hash, rol, porcentaje_comision) VALUES (?, ?, ?, ?)`,
        ['testuser', hash, 'VENDEDOR', 5],
        resolve
      );
    });
  });

  describe('POST /api/auth/login', () => {
    test('Should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ nombre: 'testuser', password: 'testpass' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.nombre).toBe('testuser');
      expect(response.body.usuario.rol).toBe('VENDEDOR');
    });

    test('Should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ nombre: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciales inválidas');
    });

    test('Should fail if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ nombre: 'nonexistent', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciales inválidas');
    });

    test('Should fail if name or password is missing', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ nombre: 'testuser' });
      expect(response1.status).toBe(400);

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'testuser' });
      expect(response2.status).toBe(400);
    });
  });

  describe('JWT Verification Middleware', () => {
    test('Should deny access without token', async () => {
      // Usamos una ruta protegida cualquiera, por ejemplo GET /api/productos
      const response = await request(app).get('/api/productos');
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Token requerido');
    });

    test('Should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/productos')
        .set('Authorization', 'Bearer invalid_token');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token inválido o expirado');
    });
  });
});
