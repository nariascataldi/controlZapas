const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.post('/', verificarToken, async (req, res) => {
    const { cliente_nombre, contacto, detalles, total, metodo_pago, estado } = req.body;
    
    if (!cliente_nombre || !detalles || !Array.isArray(detalles) || total === undefined) {
        return res.status(400).json({ error: 'Datos de venta incompletos o inválidos' });
    }

    const vendedor_id = req.user.id;
    const porcentaje_comision = req.user.porcentajeComision || 0;
    const comision_calculada = total * (porcentaje_comision / 100);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const cliente = await tx.cliente.create({
                data: { nombre: cliente_nombre, contacto }
            });

            const venta = await tx.venta.create({
                data: {
                    clienteId: cliente.id,
                    vendedorId: vendedor_id,
                    total,
                    comisionCalculada: comision_calculada,
                    metodoPago: metodo_pago || 'Efectivo',
                    estado: estado || 'Pagado'
                }
            });

            for (const d of detalles) {
                const variante = await tx.variante.findUnique({ where: { id: d.variante_id } });
                if (!variante || variante.stockActual < d.cantidad) {
                    throw new Error('Stock insuficiente');
                }

                await tx.variante.update({
                    where: { id: d.variante_id },
                    data: { stockActual: { decrement: d.cantidad } }
                });

                await tx.ventaDetalle.create({
                    data: {
                        ventaId: venta.id,
                        varianteId: d.variante_id,
                        cantidad: d.cantidad,
                        precioUnitario: d.precio_unitario
                    }
                });
            }

            return venta;
        });

        res.json({ mensaje: 'Venta registrada exitosamente', venta_id: result.id });
    } catch (err) {
        console.error(err);
        if (err.message === 'Stock insuficiente') {
            return res.status(400).json({ error: 'Stock insuficiente para uno o más artículos' });
        }
        return res.status(500).json({ error: 'Error registrando venta' });
    }
});

router.get('/', verificarToken, async (req, res) => {
    const { cliente, producto, sale_id, desde, hasta, metodo_pago, estado, vendedor_id, limit, offset, sort, sortOrder } = req.query;
    
    try {
        const where = {};

        if (req.user.rol !== 'ADMIN') {
            where.vendedorId = req.user.id;
        } else if (vendedor_id) {
            where.vendedorId = parseInt(vendedor_id);
        }

        if (cliente) {
            where.cliente = { nombre: { contains: cliente, mode: 'insensitive' } };
        }

        if (sale_id) {
            where.id = parseInt(sale_id);
        }

        if (desde || hasta) {
            where.fecha = {};
            if (desde) where.fecha.gte = new Date(desde);
            if (hasta) where.fecha.lte = new Date(hasta + ' 23:59:59');
        }

        if (metodo_pago) {
            where.metodoPago = metodo_pago;
        }

        if (estado) {
            where.estado = estado;
        }

        const pageLimit = parseInt(limit) || 25;
        const pageOffset = parseInt(offset) || 0;

        const [ventas, total] = await Promise.all([
            prisma.venta.findMany({
                where,
                include: {
                    cliente: true,
                    vendedor: { select: { nombre: true } },
                    detalles: {
                        include: {
                            variante: {
                                include: { producto: true }
                            }
                        }
                    }
                },
                orderBy: { fecha: sortOrder === 'asc' ? 'asc' : 'desc' },
                skip: pageOffset,
                take: pageLimit
            }),
            prisma.venta.count({ where })
        ]);

        const data = ventas.map(v => ({
            id: v.id,
            fecha: v.fecha,
            total: v.total,
            comision_calculada: v.comisionCalculada,
            metodo_pago: v.metodoPago,
            estado: v.estado,
            cliente: v.cliente?.nombre,
            vendedor: v.vendedor?.nombre,
            productos: v.detalles.map(d => d.variante?.producto?.nombre).filter(Boolean).join(', ')
        }));

        res.json({
            data,
            pagination: {
                total,
                limit: pageLimit,
                offset: pageOffset,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error obteniendo historial' });
    }
});

router.get('/:id', verificarToken, async (req, res) => {
    const ventaId = parseInt(req.params.id);
    
    try {
        const venta = await prisma.venta.findUnique({
            where: { id: ventaId },
            include: {
                cliente: true,
                vendedor: { select: { nombre: true } },
                detalles: {
                    include: {
                        variante: {
                            include: { producto: true }
                        }
                    }
                }
            }
        });

        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
        
        if (req.user.rol !== 'ADMIN' && venta.vendedorId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta venta' });
        }

        res.json({
            id: venta.id,
            fecha: venta.fecha,
            total: venta.total,
            comision_calculada: venta.comisionCalculada,
            metodo_pago: venta.metodoPago,
            estado: venta.estado,
            cliente: venta.cliente?.nombre,
            contacto: venta.cliente?.contacto,
            vendedor: venta.vendedor?.nombre,
            detalles: venta.detalles.map(d => ({
                id: d.id,
                producto: d.variante?.producto?.nombre,
                sku: d.variante?.sku,
                color: d.variante?.color,
                talla: d.variante?.talla,
                cantidad: d.cantidad,
                precio_unitario: d.precioUnitario
            }))
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error consultando venta' });
    }
});

router.put('/:id', verificarToken, async (req, res) => {
    const ventaId = parseInt(req.params.id);
    const { estado, metodo_pago } = req.body;

    try {
        const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
        
        if (req.user.rol !== 'ADMIN' && venta.vendedorId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta venta' });
        }

        const data = {};
        if (estado !== undefined) data.estado = estado;
        if (metodo_pago !== undefined) data.metodoPago = metodo_pago;

        await prisma.venta.update({
            where: { id: ventaId },
            data
        });

        res.json({ mensaje: 'Venta actualizada correctamente' });
    } catch (err) {
        return res.status(500).json({ error: 'Error actualizando venta' });
    }
});

router.delete('/:id', verificarToken, async (req, res) => {
    const ventaId = parseInt(req.params.id);

    if (req.user.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo un administrador puede eliminar ventas' });
    }

    try {
        const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

        await prisma.$transaction(async (tx) => {
            await tx.ventaDetalle.deleteMany({ where: { ventaId } });
            await tx.venta.delete({ where: { id: ventaId } });
        });

        res.json({ mensaje: 'Venta eliminada correctamente', id: ventaId });
    } catch (err) {
        return res.status(500).json({ error: 'Error eliminando venta' });
    }
});

router.post('/:id/duplicar', verificarToken, async (req, res) => {
    const ventaId = parseInt(req.params.id);
    const vendedor_id = req.user.id;

    try {
        const venta = await prisma.venta.findUnique({
            where: { id: ventaId },
            include: { detalles: true }
        });
        if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

        const result = await prisma.$transaction(async (tx) => {
            const nuevaVenta = await tx.venta.create({
                data: {
                    clienteId: venta.clienteId,
                    vendedorId: vendedor_id,
                    total: venta.total,
                    comisionCalculada: venta.comisionCalculada,
                    metodoPago: venta.metodoPago,
                    estado: 'Pendiente'
                }
            });

            for (const d of venta.detalles) {
                await tx.ventaDetalle.create({
                    data: {
                        ventaId: nuevaVenta.id,
                        varianteId: d.varianteId,
                        cantidad: d.cantidad,
                        precioUnitario: d.precioUnitario
                    }
                });
            }

            return nuevaVenta;
        });

        res.json({ mensaje: 'Venta duplicada correctamente', nueva_venta_id: result.id });
    } catch (err) {
        return res.status(500).json({ error: 'Error duplicando venta' });
    }
});

router.get('/dashboard', verificarToken, soloAdmin, async (req, res) => {
    try {
        const [ventasTotales, unidadesVendidas, stockCritico] = await Promise.all([
            prisma.venta.aggregate({ _sum: { total: true } }),
            prisma.ventaDetalle.aggregate({ _sum: { cantidad: true } }),
            prisma.variante.count({ where: { stockActual: { lte: prisma.variante.fields.stockMinimo } } })
        ]);

        res.json({
            ventas_totales: ventasTotales._sum.total || 0,
            unidades_vendidas: unidadesVendidas._sum.cantidad || 0,
            stock_critico: stockCritico
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error obteniendo dashboard' });
    }
});

module.exports = router;
