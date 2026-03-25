const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, soloAdmin } = require('./auth');

// Registrar una nueva venta (Vendedores y Admin)
router.post('/', verificarToken, (req, res) => {
    const { cliente_nombre, contacto, detalles, total } = req.body;
    const vendedor_id = req.user.id;
    const porcentaje_comision = req.user.porcentaje_comision || 0;
    const comision_calculada = total * (porcentaje_comision / 100);

    // Iniciar transacción manualmente en SQLite
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        // 1. Insertar cliente si es nuevo, o recuperar ID
        db.run(`INSERT INTO clientes (nombre, contacto) VALUES (?, ?)`, [cliente_nombre, contacto], function(err) {
            if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: 'Error registrando cliente' });
            }
            
            const cliente_id = this.lastID;

            // 2. Insertar venta
            db.run(
                `INSERT INTO ventas (cliente_id, vendedor_id, total, comision_calculada) VALUES (?, ?, ?, ?)`,
                [cliente_id, vendedor_id, total, comision_calculada],
                function(err) {
                    if (err) {
                        db.run("ROLLBACK;");
                        return res.status(500).json({ error: 'Error registrando venta' });
                    }

                    const venta_id = this.lastID;
                    const stmt = db.prepare(`INSERT INTO venta_detalles (venta_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`);
                    const stockStmt = db.prepare(`UPDATE variantes SET stock_actual = stock_actual - ? WHERE id = ? AND stock_actual >= ?`);
                    
                    let errorEnDetalle = false;

                    // 3. Insertar detalles y descontar stock
                    detalles.forEach(d => {
                        stmt.run(venta_id, d.variante_id, d.cantidad, d.precio_unitario);
                        stockStmt.run(d.cantidad, d.variante_id, d.cantidad, function(err) {
                            if (err || this.changes === 0) {
                                errorEnDetalle = true;
                            }
                        });
                    });

                    stmt.finalize();
                    stockStmt.finalize(() => {
                        if (errorEnDetalle) {
                            db.run("ROLLBACK;");
                            return res.status(400).json({ error: 'Stock insuficiente para uno o más artículos' });
                        } else {
                            db.run("COMMIT;");
                            res.json({ mensaje: 'Venta registrada exitosamente', venta_id });
                        }
                    });
                }
            );
        });
    });
});

// Obtener historial de ventas (Admin ve todas, vendedor ve las suyas)
router.get('/', verificarToken, (req, res) => {
    let query = `
        SELECT v.id, v.fecha, v.total, v.comision_calculada, c.nombre as cliente, u.nombre as vendedor
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.vendedor_id = u.id
    `;
    let params = [];

    if (req.user.rol !== 'ADMIN') {
        query += ` WHERE v.vendedor_id = ?`;
        params.push(req.user.id);
    }

    query += ` ORDER BY v.fecha DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo historial' });
        res.json(rows);
    });
});

// Dashboard metrics (Solo Admin)
router.get('/dashboard', verificarToken, soloAdmin, (req, res) => {
    // Queries simples para el dashboard
    const queries = {
        ventas_totales: `SELECT SUM(total) as suma FROM ventas`,
        unidades_vendidas: `SELECT SUM(cantidad) as suma FROM venta_detalles`,
        stock_critico: `SELECT COUNT(*) as cuenta FROM variantes WHERE stock_actual <= stock_minimo`
    };

    let dashboard = {};
    let pending = 3;

    const checkDone = () => {
        pending--;
        if (pending === 0) res.json(dashboard);
    }

    db.get(queries.ventas_totales, [], (err, row) => { dashboard.ventas_totales = row ? row.suma : 0; checkDone(); });
    db.get(queries.unidades_vendidas, [], (err, row) => { dashboard.unidades_vendidas = row ? row.suma : 0; checkDone(); });
    db.get(queries.stock_critico, [], (err, row) => { dashboard.stock_critico = row ? row.cuenta : 0; checkDone(); });
});

module.exports = router;
