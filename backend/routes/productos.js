const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, soloAdmin } = require('./auth');

// Obtener todos los productos y sus variantes
router.get('/', verificarToken, (req, res) => {
    const query = `
        SELECT p.id as producto_id, p.nombre, p.marca, p.precio_mayorista, p.precio_minorista, p.categoria,
               v.id as variante_id, v.sku, v.color, v.talla, v.stock_actual, v.stock_minimo
        FROM productos p
        LEFT JOIN variantes v ON p.id = v.producto_id
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(rows);
    });
});

// Crear un nuevo producto (Solo admin)
router.post('/', verificarToken, soloAdmin, (req, res) => {
    const { nombre, marca, precio_mayorista, precio_minorista, categoria, variantes } = req.body;
    
    db.run(
        `INSERT INTO productos (nombre, marca, precio_mayorista, precio_minorista, categoria) VALUES (?, ?, ?, ?, ?)`,
        [nombre, marca, precio_mayorista, precio_minorista, categoria],
        function(err) {
            if (err) return res.status(500).json({ error: 'Error al crear producto' });
            
            const productoId = this.lastID;
            
            if (variantes && variantes.length > 0) {
                const stmt = db.prepare(`INSERT INTO variantes (producto_id, sku, color, talla, stock_actual, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)`);
                variantes.forEach(v => {
                    stmt.run(productoId, v.sku, v.color, v.talla, v.stock_actual, v.stock_minimo);
                });
                stmt.finalize();
            }
            
            res.json({ id: productoId, mensaje: 'Producto creado exitosamente' });
        }
    );
});

// Actualizar stock de una variante (Solo admin)
router.put('/variantes/:id/stock', verificarToken, soloAdmin, (req, res) => {
    const { stock_actual } = req.body;
    const varianteId = req.params.id;
    
    db.run(
        `UPDATE variantes SET stock_actual = ? WHERE id = ?`,
        [stock_actual, varianteId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Error al actualizar stock' });
            res.json({ mensaje: 'Stock actualizado correctamente' });
        }
    );
});

// Búsqueda de productos por texto, talla (disponible para todos los roles)
router.get('/buscar', verificarToken, (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const query = `
        SELECT p.nombre, p.marca, p.precio_mayorista, p.precio_minorista,
               v.id as variante_id, v.sku, v.color, v.talla, v.stock_actual
        FROM productos p
        JOIN variantes v ON p.id = v.producto_id
        WHERE p.nombre LIKE ? OR v.sku LIKE ? OR v.talla LIKE ?
    `;
    
    db.all(query, [q, q, q], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error en la búsqueda' });
        res.json(rows);
    });
});

module.exports = router;
