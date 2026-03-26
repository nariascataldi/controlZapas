const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, soloAdmin } = require('./auth');

// Registrar una nueva venta (Vendedores y Admin)
router.post('/', verificarToken, (req, res) => {
    const { cliente_nombre, contacto, detalles, total, metodo_pago, estado } = req.body;
    
    if (!cliente_nombre || !detalles || !Array.isArray(detalles) || total === undefined) {
        return res.status(400).json({ error: 'Datos de venta incompletos o inválidos' });
    }

    const vendedor_id = req.user.id;
    const porcentaje_comision = req.user.porcentaje_comision || 0;
    const comision_calculada = total * (porcentaje_comision / 100);

    // Transacción para asegurar consistencia
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        // 1. Cliente
        db.run(`INSERT INTO clientes (nombre, contacto) VALUES (?, ?)`, [cliente_nombre, contacto], function(err) {
            if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: 'Error registrando cliente' });
            }

            const cliente_id = this.lastID;
            
            // 2. Venta
            db.run(
                `INSERT INTO ventas (cliente_id, vendedor_id, total, comision_calculada, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?)`,
                [cliente_id, vendedor_id, total, comision_calculada, metodo_pago || 'Efectivo', estado || 'Pagado'],
                function(err) {
                    if (err) {
                        db.run("ROLLBACK;");
                        return res.status(500).json({ error: 'Error registrando venta' });
                    }

                    const venta_id = this.lastID;

                    try {
                        const stmt = db.prepare(`INSERT INTO venta_detalles (venta_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`);
                        const stockStmt = db.prepare(`UPDATE variantes SET stock_actual = stock_actual - ? WHERE id = ? AND stock_actual >= ?`);
                        
                        let errorEnDetalle = false;

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
                                res.status(400).json({ error: 'Stock insuficiente para uno o más artículos' });
                            } else {
                                db.run("COMMIT;");
                                res.json({ mensaje: 'Venta registrada exitosamente', venta_id });
                            }
                        });
                    } catch (e) {
                        db.run("ROLLBACK;");
                        res.status(500).json({ error: 'Error interno en el procesamiento de detalles' });
                    }
                }
            );
        });
    });
});

// Obtener historial de ventas con filtros avanzados + paginación + sorting
router.get('/', verificarToken, (req, res) => {
    const { cliente, producto, sale_id, desde, hasta, metodo_pago, estado, vendedor_id, limit, offset, sort, sortOrder } = req.query;
    
    let query = `
        SELECT DISTINCT v.id, v.fecha, v.total, v.comision_calculada, v.metodo_pago, v.estado, 
               c.nombre as cliente, u.nombre as vendedor,
               (SELECT GROUP_CONCAT(p.nombre, ', ') 
                FROM venta_detalles vd 
                JOIN variantes var ON vd.variante_id = var.id 
                JOIN productos p ON var.producto_id = p.id 
                WHERE vd.venta_id = v.id) as productos
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN venta_detalles vd ON v.id = vd.venta_id
        LEFT JOIN variantes var ON vd.variante_id = var.id
        LEFT JOIN productos p ON var.producto_id = p.id
        WHERE 1=1
    `;
    let countQuery = `
        SELECT COUNT(DISTINCT v.id) as total
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN venta_detalles vd ON v.id = vd.venta_id
        LEFT JOIN variantes var ON vd.variante_id = var.id
        LEFT JOIN productos p ON var.producto_id = p.id
        WHERE 1=1
    `;
    let params = [];
    let countParams = [];

    if (req.user.rol !== 'ADMIN') {
        query += ` AND v.vendedor_id = ?`;
        countQuery += ` AND v.vendedor_id = ?`;
        params.push(req.user.id);
        countParams.push(req.user.id);
    } else if (vendedor_id) {
        query += ` AND v.vendedor_id = ?`;
        countQuery += ` AND v.vendedor_id = ?`;
        params.push(vendedor_id);
        countParams.push(vendedor_id);
    }

    if (cliente) {
        query += ` AND c.nombre LIKE ?`;
        countQuery += ` AND c.nombre LIKE ?`;
        params.push(`%${cliente}%`);
        countParams.push(`%${cliente}%`);
    }

    if (producto) {
        query += ` AND p.nombre LIKE ?`;
        countQuery += ` AND p.nombre LIKE ?`;
        params.push(`%${producto}%`);
        countParams.push(`%${producto}%`);
    }

    if (sale_id) {
        query += ` AND v.id = ?`;
        countQuery += ` AND v.id = ?`;
        params.push(sale_id);
        countParams.push(sale_id);
    }

    if (desde) {
        query += ` AND v.fecha >= ?`;
        countQuery += ` AND v.fecha >= ?`;
        params.push(desde);
        countParams.push(desde);
    }

    if (hasta) {
        query += ` AND v.fecha <= ?`;
        countQuery += ` AND v.fecha <= ?`;
        params.push(hasta + ' 23:59:59');
        countParams.push(hasta + ' 23:59:59');
    }

    if (metodo_pago) {
        query += ` AND v.metodo_pago = ?`;
        countQuery += ` AND v.metodo_pago = ?`;
        params.push(metodo_pago);
        countParams.push(metodo_pago);
    }

    if (estado) {
        query += ` AND v.estado = ?`;
        countQuery += ` AND v.estado = ?`;
        params.push(estado);
        countParams.push(estado);
    }

    const sortColumn = sort || 'v.fecha';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const validColumns = ['v.id', 'v.fecha', 'c.nombre', 'v.total', 'v.metodo_pago', 'v.estado', 'u.nombre'];
    const columnKey = {
        'id': 'v.id',
        'fecha': 'v.fecha',
        'cliente': 'c.nombre',
        'total': 'v.total',
        'metodo_pago': 'v.metodo_pago',
        'estado': 'v.estado',
        'vendedor': 'u.nombre'
    };
    const safeColumn = validColumns.includes(columnKey[sort]) ? columnKey[sort] : 'v.fecha';
    
    query += ` ORDER BY ${safeColumn} ${sortDirection}`;

    const pageLimit = parseInt(limit) || 25;
    const pageOffset = parseInt(offset) || 0;
    query += ` LIMIT ? OFFSET ?`;

    db.get(countQuery, countParams, (err, countRow) => {
        if (err) {
            console.error('Error contando ventas:', err.message);
            return res.status(500).json({ error: 'Error contando historial' });
        }

        const totalRecords = countRow.total;
        params.push(pageLimit, pageOffset);

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error en búsqueda de ventas:', err.message);
                return res.status(500).json({ error: 'Error obteniendo historial' });
            }
            res.json({
                data: rows,
                pagination: {
                    total: totalRecords,
                    limit: pageLimit,
                    offset: pageOffset,
                    totalPages: Math.ceil(totalRecords / pageLimit)
                }
            });
        });
    });
});

// Obtener detalle de una venta específica
router.get('/:id', verificarToken, (req, res) => {
    const ventaId = req.params.id;
    
    const query = `
        SELECT v.*, c.nombre as cliente, c.contacto, u.nombre as vendedor
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.vendedor_id = u.id
        WHERE v.id = ?
    `;
    
    const detallesQuery = `
        SELECT vd.*, p.nombre as producto, var.sku, var.color, var.talla
        FROM venta_detalles vd
        JOIN variantes var ON vd.variante_id = var.id
        JOIN productos p ON var.producto_id = p.id
        WHERE vd.venta_id = ?
    `;

    db.get(query, [ventaId], (err, venta) => {
        if (err) return res.status(500).json({ error: 'Error consultando venta' });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
        
        if (req.user.rol !== 'ADMIN' && venta.vendedor_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta venta' });
        }

        db.all(detallesQuery, [ventaId], (err, detalles) => {
            if (err) return res.status(500).json({ error: 'Error consultando detalles' });
            
            res.json({
                ...venta,
                detalles: detalles.map(d => ({
                    id: d.id,
                    producto: d.producto,
                    sku: d.sku,
                    color: d.color,
                    talla: d.talla,
                    cantidad: d.cantidad,
                    precio_unitario: d.precio_unitario
                }))
            });
        });
    });
});

// Actualizar una venta
router.put('/:id', verificarToken, (req, res) => {
    const ventaId = req.params.id;
    const { estado, metodo_pago } = req.body;

    db.get(`SELECT * FROM ventas WHERE id = ?`, [ventaId], (err, venta) => {
        if (err) return res.status(500).json({ error: 'Error consultando venta' });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
        
        if (req.user.rol !== 'ADMIN' && venta.vendedor_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta venta' });
        }

        const updates = [];
        const params = [];

        if (estado !== undefined) {
            updates.push('estado = ?');
            params.push(estado);
        }
        if (metodo_pago !== undefined) {
            updates.push('metodo_pago = ?');
            params.push(metodo_pago);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(ventaId);
        db.run(`UPDATE ventas SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
            if (err) return res.status(500).json({ error: 'Error actualizando venta' });
            res.json({ mensaje: 'Venta actualizada correctamente', changes: this.changes });
        });
    });
});

// Eliminar una venta
router.delete('/:id', verificarToken, (req, res) => {
    const ventaId = req.params.id;

    if (req.user.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo un administrador puede eliminar ventas' });
    }

    db.serialize(() => {
        db.get(`SELECT * FROM ventas WHERE id = ?`, [ventaId], (err, venta) => {
            if (err) return res.status(500).json({ error: 'Error consultando venta' });
            if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

            db.run(`DELETE FROM venta_detalles WHERE venta_id = ?`, [ventaId], (err) => {
                if (err) return res.status(500).json({ error: 'Error eliminando detalles' });

                db.run(`DELETE FROM ventas WHERE id = ?`, [ventaId], function(err) {
                    if (err) return res.status(500).json({ error: 'Error eliminando venta' });
                    res.json({ mensaje: 'Venta eliminada correctamente', id: ventaId });
                });
            });
        });
    });
});

// Duplicar una venta
router.post('/:id/duplicar', verificarToken, (req, res) => {
    const ventaId = req.params.id;
    const vendedor_id = req.user.id;

    db.get(`SELECT * FROM ventas WHERE id = ?`, [ventaId], (err, venta) => {
        if (err) return res.status(500).json({ error: 'Error consultando venta' });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            db.run(`INSERT INTO ventas (cliente_id, vendedor_id, total, comision_calculada, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?)`,
                [venta.cliente_id, vendedor_id, venta.total, venta.comision_calculada, venta.metodo_pago, 'Pendiente'],
                function(err) {
                    if (err) {
                        db.run("ROLLBACK;");
                        return res.status(500).json({ error: 'Error duplicando venta' });
                    }

                    const nuevaVentaId = this.lastID;

                    db.all(`SELECT * FROM venta_detalles WHERE venta_id = ?`, [ventaId], (err, detalles) => {
                        if (err) {
                            db.run("ROLLBACK;");
                            return res.status(500).json({ error: 'Error consultando detalles' });
                        }

                        const stmt = db.prepare(`INSERT INTO venta_detalles (venta_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`);
                        
                        detalles.forEach(d => {
                            stmt.run(nuevaVentaId, d.variante_id, d.cantidad, d.precio_unitario);
                        });

                        stmt.finalize(() => {
                            db.run("COMMIT;");
                            res.json({ mensaje: 'Venta duplicada correctamente', nueva_venta_id: nuevaVentaId });
                        });
                    });
                }
            );
        });
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
