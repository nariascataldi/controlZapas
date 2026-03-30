const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.get('/', verificarToken, soloAdmin, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: { id: true, nombre: true, rol: true, porcentajeComision: true }
        });
        res.json(usuarios);
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

router.get('/:id', verificarToken, soloAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { id: true, nombre: true, rol: true, porcentajeComision: true }
        });
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo usuario' });
    }
});

router.post('/', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, password, rol, porcentaje_comision } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' });
    }

    const rolFinal = rol || 'VENDEDOR';
    const comision = porcentaje_comision || 0;
    const hash = bcrypt.hashSync(password, 10);

    try {
        const usuario = await prisma.usuario.create({
            data: {
                nombre,
                passwordHash: hash,
                rol: rolFinal,
                porcentajeComision: comision
            }
        });
        res.status(201).json({ id: usuario.id, nombre, rol: rolFinal, porcentaje_comision: comision });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
        }
        return res.status(500).json({ error: 'Error creando usuario' });
    }
});

router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, password, rol, porcentaje_comision } = req.body;
    const userId = parseInt(req.params.id);

    try {
        const existing = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

        const data = {
            nombre,
            rol,
            porcentajeComision: porcentaje_comision
        };

        if (password && password.trim() !== '') {
            data.passwordHash = bcrypt.hashSync(password, 10);
        }

        await prisma.usuario.update({
            where: { id: userId },
            data
        });
        res.json({ mensaje: 'Usuario actualizado' });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
        }
        return res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    try {
        await prisma.usuario.delete({ where: { id: userId } });
        res.json({ mensaje: 'Usuario eliminado' });
    } catch (err) {
        return res.status(500).json({ error: 'Error eliminando usuario' });
    }
});

router.get('/:id/ventas', verificarToken, soloAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const ventas = await prisma.venta.findMany({
            where: { vendedorId: userId },
            include: { cliente: true },
            orderBy: { fecha: 'desc' }
        });
        res.json(ventas.map(v => ({
            id: v.id,
            fecha: v.fecha,
            total: v.total,
            comision_calculada: v.comisionCalculada,
            cliente: v.cliente?.nombre || null
        })));
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo historial del vendedor' });
    }
});

router.get('/:id/comisiones', verificarToken, soloAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            include: {
                ventas: true
            }
        });
        if (!usuario) return res.status(404).json({ error: 'Vendedor no encontrado' });

        const totalVentas = usuario.ventas.length;
        const montoTotal = usuario.ventas.reduce((sum, v) => sum + v.total, 0);
        const comisionTotal = usuario.ventas.reduce((sum, v) => sum + v.comisionCalculada, 0);

        res.json({
            vendedor: usuario.nombre,
            porcentaje_comision: usuario.porcentajeComision,
            total_ventas: totalVentas,
            monto_total_vendido: montoTotal,
            comision_total_acumulada: comisionTotal
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo comisiones' });
    }
});

router.get('/reportes/comisiones', verificarToken, soloAdmin, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { rol: 'VENDEDOR' },
            include: { ventas: true }
        });

        const result = usuarios.map(u => ({
            id: u.id,
            vendedor: u.nombre,
            porcentaje_comision: u.porcentajeComision,
            total_ventas: u.ventas.length,
            monto_total_vendido: u.ventas.reduce((sum, v) => sum + v.total, 0),
            comision_acumulada: u.ventas.reduce((sum, v) => sum + v.comisionCalculada, 0)
        }));

        result.sort((a, b) => b.comision_acumulada - a.comision_acumulada);
        res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo reporte de comisiones' });
    }
});

router.get('/clientes/todos', verificarToken, async (req, res) => {
    try {
        const clientes = await prisma.cliente.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(clientes);
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo clientes' });
    }
});

router.get('/clientes/:id/ventas', verificarToken, async (req, res) => {
    const clienteId = parseInt(req.params.id);
    try {
        const ventas = await prisma.venta.findMany({
            where: { clienteId },
            include: { vendedor: { select: { nombre: true } } },
            orderBy: { fecha: 'desc' }
        });
        res.json(ventas.map(v => ({
            id: v.id,
            fecha: v.fecha,
            total: v.total,
            vendedor: v.vendedor.nombre
        })));
    } catch (err) {
        return res.status(500).json({ error: 'Error obteniendo historial del cliente' });
    }
});

module.exports = router;
