const db = require('../database');
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
  // Asegurarnos de que estamos en entorno de test
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Solo se pueden ejecutar tests en NODE_ENV=test');
  }
});

afterAll(async () => {
  // Limpiar la base de datos de test al finalizar (opcional, o dejarla para debuggear)
  // db.close();
});

// Función helper para limpiar tablas específicas antes de los tests
global.clearDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM venta_detalles');
      db.run('DELETE FROM ventas');
      db.run('DELETE FROM producto_imagenes');
      db.run('DELETE FROM variantes');
      db.run('DELETE FROM productos');
      db.run('DELETE FROM clientes');
      db.run('DELETE FROM usuarios WHERE nombre != "admin"', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};
