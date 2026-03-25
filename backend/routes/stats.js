const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, soloAdmin } = require('./auth');

// Funciones helpers para ejecutar queries como promesas
const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getRow = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Dashboard KPIs (Admin)
router.get('/kpis', verificarToken, soloAdmin, async (req, res) => {
    try {
        const ventasMesTarget = await getRow(`
            SELECT COALESCE(SUM(total), 0) as total 
            FROM ventas 
            WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
        `);
        
        const comisionesTarget = await getRow(`
            SELECT COALESCE(SUM(comision_calculada), 0) as total 
            FROM ventas 
            WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
        `);

        // Asumiendo que las ganancias para la tienda son el TOTAL vendido menos la comisión
        const gananciasMes = ventasMesTarget.total - comisionesTarget.total;

        res.json({
            ventas_totales_mes: ventasMesTarget.total,
            ganancias_netas_mes: gananciasMes,
            comisiones_por_pagar: comisionesTarget.total
        });
    } catch (error) {
        console.error('Error calculando KPIs:', error);
        res.status(500).json({ error: 'Error interno obteniendo KPIs' });
    }
});

// Historial por Vendedor (Admin)
router.get('/rendimiento-vendedores', verificarToken, soloAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.nombre, 
                u.porcentaje_comision,
                COUNT(v.id) as cantidad_ventas,
                COALESCE(SUM(v.total), 0) as total_vendido,
                COALESCE(SUM(v.comision_calculada), 0) as total_comisiones
            FROM usuarios u
            LEFT JOIN ventas v ON u.id = v.vendedor_id
            WHERE u.rol = 'VENDEDOR'
            GROUP BY u.id
            ORDER BY total_vendido DESC
        `;
        const rendimiento = await runQuery(query);
        res.json(rendimiento);
    } catch (error) {
        console.error('Error obteniendo rendimiento de vendedores:', error);
        res.status(500).json({ error: 'Error interno obteniendo datos de vendedores' });
    }
});

// Historial por Cliente (Admin)
router.get('/historial-clientes', verificarToken, soloAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.contacto,
                COUNT(v.id) as cantidad_compras,
                COALESCE(SUM(v.total), 0) as total_gastado,
                MAX(v.fecha) as ultima_compra
            FROM clientes c
            JOIN ventas v ON c.id = v.cliente_id
            GROUP BY c.id
            ORDER BY total_gastado DESC
        `;
        const historial = await runQuery(query);
        res.json(historial);
    } catch (error) {
        console.error('Error obteniendo historial de clientes:', error);
        res.status(500).json({ error: 'Error interno obteniendo datos de clientes' });
    }
});

// Top Productos (Admin)
router.get('/top-productos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.nombre, 
                p.marca,
                SUM(vd.cantidad) as unidades_vendidas,
                SUM(vd.cantidad * vd.precio_unitario) as ingresos_generados
            FROM venta_detalles vd
            JOIN variantes v ON vd.variante_id = v.id
            JOIN productos p ON v.producto_id = p.id
            GROUP BY p.id
            ORDER BY unidades_vendidas DESC
            LIMIT 5
        `;
        const top = await runQuery(query);
        res.json(top);
    } catch (error) {
        console.error('Error obteniendo top productos:', error);
        res.status(500).json({ error: 'Error interno obteniendo top productos' });
    }
});

module.exports = router;
