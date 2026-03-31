const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.get('/kpis', verificarToken, soloAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [ventasMes, comisiones] = await Promise.all([
            prisma.venta.aggregate({
                where: { fecha: { gte: startOfMonth } },
                _sum: { total: true }
            }),
            prisma.venta.aggregate({
                where: { fecha: { gte: startOfMonth } },
                _sum: { comisionCalculada: true }
            })
        ]);

        const ventasTotalesMes = ventasMes._sum.total || 0;
        const comisionesPorPagar = comisiones._sum.comisionCalculada || 0;
        const gananciasMes = ventasTotalesMes - comisionesPorPagar;

        res.json({
            ventas_totales_mes: ventasTotalesMes,
            ganancias_netas_mes: gananciasMes,
            comisiones_por_pagar: comisionesPorPagar
        });
    } catch (error) {
        console.error('Error calculando KPIs:', error);
        res.status(500).json({ error: 'Error interno obteniendo KPIs' });
    }
});

router.get('/rendimiento-vendedores', verificarToken, soloAdmin, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { rol: 'VENDEDOR' },
            include: { ventas: true }
        });

        const rendimiento = usuarios.map(u => ({
            id: u.id,
            nombre: u.nombre,
            porcentaje_comision: u.porcentajeComision,
            cantidad_ventas: u.ventas.length,
            total_vendido: u.ventas.reduce((sum, v) => sum + v.total, 0),
            total_comisiones: u.ventas.reduce((sum, v) => sum + v.comisionCalculada, 0)
        }));

        rendimiento.sort((a, b) => b.total_vendido - a.total_vendido);
        res.json(rendimiento);
    } catch (error) {
        console.error('Error obteniendo rendimiento de vendedores:', error);
        res.status(500).json({ error: 'Error interno obteniendo datos de vendedores' });
    }
});

router.get('/historial-clientes', verificarToken, soloAdmin, async (req, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            include: {
                ventas: {
                    select: { total: true, fecha: true }
                }
            }
        });

        const historial = clientes
            .filter(c => c.ventas.length > 0)
            .map(c => ({
                id: c.id,
                nombre: c.nombre,
                contacto: c.contacto,
                cantidad_compras: c.ventas.length,
                total_gastado: c.ventas.reduce((sum, v) => sum + v.total, 0),
                ultima_compra: c.ventas.reduce((max, v) => v.fecha > max ? v.fecha : max, new Date(0))
            }))
            .sort((a, b) => b.total_gastado - a.total_gastado);

        res.json(historial);
    } catch (error) {
        console.error('Error obteniendo historial de clientes:', error);
        res.status(500).json({ error: 'Error interno obteniendo datos de clientes' });
    }
});

router.get('/top-productos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const detalles = await prisma.ventaDetalle.findMany({
            include: {
                variante: {
                    include: { producto: true }
                }
            }
        });

        const productosMap = {};
        detalles.forEach(d => {
            const prod = d.variante?.producto;
            if (!prod) return;
            
            if (!productosMap[prod.id]) {
                productosMap[prod.id] = {
                    nombre: prod.nombre,
                    marca: prod.marca,
                    unidades_vendidas: 0,
                    ingresos_generados: 0
                };
            }
            productosMap[prod.id].unidades_vendidas += d.cantidad;
            productosMap[prod.id].ingresos_generados += d.cantidad * d.precioUnitario;
        });

        const top = Object.values(productosMap)
            .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
            .slice(0, 5);

        res.json(top);
    } catch (error) {
        console.error('Error obteniendo top productos:', error);
        res.status(500).json({ error: 'Error interno obteniendo top productos' });
    }
});

router.get('/inventario', verificarToken, async (req, res) => {
    try {
        const esAdmin = req.usuario?.rol === 'ADMIN';
        
        // Si es vendedor, solo devolver rotación (dato no sensible)
        if (!esAdmin) {
            const hace30dias = new Date();
            hace30dias.setDate(hace30dias.getDate() - 30);
            
            const [variantes, ventasUltimoMes] = await Promise.all([
                prisma.variante.count(),
                prisma.ventaDetalle.findMany({
                    where: { venta: { fecha: { gte: hace30dias } } }
                })
            ]);
            
            const unidadesVendidas = ventasUltimoMes.reduce((sum, d) => sum + d.cantidad, 0);
            const rotacion = variantes > 0 ? (unidadesVendidas / variantes).toFixed(1) : 0;
            
            return res.json({ rotacion: parseFloat(rotacion) });
        }
        
        // Si es admin, devolver todos los datos
        const variantes = await prisma.variante.findMany({
            include: { producto: true }
        });

        const totalSku = variantes.length;
        
        const valorInventario = variantes.reduce((sum, v) => {
            const precio = v.producto?.precioMayorista || v.producto?.precioMinorista || 0;
            return sum + (v.stockActual * precio);
        }, 0);

        const stockBajo = variantes.filter(v => v.stockActual <= v.stockMinimo).length;

        const hace30dias = new Date();
        hace30dias.setDate(hace30dias.getDate() - 30);
        
        const ventasUltimoMes = await prisma.ventaDetalle.findMany({
            where: {
                venta: { fecha: { gte: hace30dias } }
            }
        });
        
        const unidadesVendidas = ventasUltimoMes.reduce((sum, d) => sum + d.cantidad, 0);
        const rotacion = totalSku > 0 ? (unidadesVendidas / totalSku).toFixed(1) : 0;

        res.json({
            totalSku,
            valorInventario: Math.round(valorInventario * 100) / 100,
            stockBajo,
            rotacion: parseFloat(rotacion)
        });
    } catch (error) {
        console.error('Error calculando stats inventario:', error);
        res.status(500).json({ error: 'Error interno obteniendo stats de inventario' });
    }
});

module.exports = router;
