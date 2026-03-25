const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database');
const { verificarToken, soloAdmin } = require('./auth');

// ─── CRUD DE VENDEDORES (Solo Admin) ───

// Listar todos los usuarios (vendedores y admins)
router.get('/', verificarToken, soloAdmin, (req, res) => {
    db.all(`SELECT id, nombre, rol, porcentaje_comision FROM usuarios ORDER BY rol, nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo usuarios' });
        res.json(rows);
    });
});

// Obtener un usuario por ID
router.get('/:id', verificarToken, soloAdmin, (req, res) => {
    db.get(`SELECT id, nombre, rol, porcentaje_comision FROM usuarios WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo usuario' });
        if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(row);
    });
});

// Crear un nuevo vendedor
router.post('/', verificarToken, soloAdmin, (req, res) => {
    const { nombre, password, rol, porcentaje_comision } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' });
    }

    const rolFinal = rol || 'VENDEDOR';
    const comision = porcentaje_comision || 0;

    const hash = bcrypt.hashSync(password, 10);

    db.run(
        `INSERT INTO usuarios (nombre, password_hash, rol, porcentaje_comision) VALUES (?, ?, ?, ?)`,
        [nombre, hash, rolFinal, comision],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
                }
                return res.status(500).json({ error: 'Error creando usuario' });
            }
            res.status(201).json({ id: this.lastID, nombre, rol: rolFinal, porcentaje_comision: comision });
        }
    );
});

// Actualizar un usuario (nombre, rol, comisión, y opcionalmente contraseña)
router.put('/:id', verificarToken, soloAdmin, (req, res) => {
    const { nombre, password, rol, porcentaje_comision } = req.body;
    const userId = req.params.id;

    // Primero verificar que existe
    db.get(`SELECT id FROM usuarios WHERE id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error en base de datos' });
        if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });

        let query = `UPDATE usuarios SET nombre = ?, rol = ?, porcentaje_comision = ?`;
        let params = [nombre, rol, porcentaje_comision];

        if (password && password.trim() !== '') {
            const hash = bcrypt.hashSync(password, 10);
            query += `, password_hash = ?`;
            params.push(hash);
        }

        query += ` WHERE id = ?`;
        params.push(userId);

        db.run(query, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
                }
                return res.status(500).json({ error: 'Error actualizando usuario' });
            }
            res.json({ mensaje: 'Usuario actualizado', changes: this.changes });
        });
    });
});

// Eliminar un usuario
router.delete('/:id', verificarToken, soloAdmin, (req, res) => {
    const userId = req.params.id;

    // No permitir eliminar el propio usuario
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    db.run(`DELETE FROM usuarios WHERE id = ?`, [userId], function (err) {
        if (err) return res.status(500).json({ error: 'Error eliminando usuario' });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ mensaje: 'Usuario eliminado' });
    });
});


// ─── HISTORIAL Y COMISIONES ───

// Historial de ventas de un vendedor específico (Admin)
router.get('/:id/ventas', verificarToken, soloAdmin, (req, res) => {
    const query = `
        SELECT v.id, v.fecha, v.total, v.comision_calculada, c.nombre as cliente
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.vendedor_id = ?
        ORDER BY v.fecha DESC
    `;
    db.all(query, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo historial del vendedor' });
        res.json(rows);
    });
});

// Resumen de comisiones de un vendedor
router.get('/:id/comisiones', verificarToken, soloAdmin, (req, res) => {
    const query = `
        SELECT 
            u.nombre as vendedor,
            u.porcentaje_comision,
            COUNT(v.id) as total_ventas,
            COALESCE(SUM(v.total), 0) as monto_total_vendido,
            COALESCE(SUM(v.comision_calculada), 0) as comision_total_acumulada
        FROM usuarios u
        LEFT JOIN ventas v ON v.vendedor_id = u.id
        WHERE u.id = ?
        GROUP BY u.id
    `;
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo comisiones' });
        if (!row) return res.status(404).json({ error: 'Vendedor no encontrado' });
        res.json(row);
    });
});

// Resumen global de comisiones de todos los vendedores (Admin Dashboard)
router.get('/reportes/comisiones', verificarToken, soloAdmin, (req, res) => {
    const query = `
        SELECT 
            u.id,
            u.nombre as vendedor,
            u.porcentaje_comision,
            COUNT(v.id) as total_ventas,
            COALESCE(SUM(v.total), 0) as monto_total_vendido,
            COALESCE(SUM(v.comision_calculada), 0) as comision_acumulada
        FROM usuarios u
        LEFT JOIN ventas v ON v.vendedor_id = u.id
        WHERE u.rol = 'VENDEDOR'
        GROUP BY u.id
        ORDER BY comision_acumulada DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo reporte de comisiones' });
        res.json(rows);
    });
});


// ─── HISTORIAL POR CLIENTE ───

// Listar todos los clientes
router.get('/clientes/todos', verificarToken, (req, res) => {
    db.all(`SELECT id, nombre, contacto FROM clientes ORDER BY nombre`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo clientes' });
        res.json(rows);
    });
});

// Historial de ventas de un cliente específico
router.get('/clientes/:id/ventas', verificarToken, (req, res) => {
    const query = `
        SELECT v.id, v.fecha, v.total, u.nombre as vendedor
        FROM ventas v
        JOIN usuarios u ON v.vendedor_id = u.id
        WHERE v.cliente_id = ?
        ORDER BY v.fecha DESC
    `;
    db.all(query, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo historial del cliente' });
        res.json(rows);
    });
});

module.exports = router;
