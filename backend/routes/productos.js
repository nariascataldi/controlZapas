const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.get('/', verificarToken, async (req, res) => {
    try {
        const productos = await prisma.producto.findMany({
            include: {
                variantes: true
            }
        });
        
        const result = productos.flatMap(p => 
            p.variantes.length > 0 
                ? p.variantes.map(v => ({
                    producto_id: p.id,
                    nombre: p.nombre,
                    marca: p.marca,
                    precio_mayorista: p.precioMayorista,
                    precio_minorista: p.precioMinorista,
                    categoria: p.categoria,
                    variante_id: v.id,
                    sku: v.sku,
                    color: v.color,
                    talla: v.talla,
                    stock_actual: v.stockActual,
                    stock_minimo: v.stockMinimo
                }))
                : [{
                    producto_id: p.id,
                    nombre: p.nombre,
                    marca: p.marca,
                    precio_mayorista: p.precioMayorista,
                    precio_minorista: p.precioMinorista,
                    categoria: p.categoria,
                    variante_id: null,
                    sku: null,
                    color: null,
                    talla: null,
                    stock_actual: null,
                    stock_minimo: null
                }]
        );
        
        res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error al obtener productos' });
    }
});

router.post('/', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, marca, precio_mayorista, precio_minorista, categoria, variantes } = req.body;
    
    try {
        const producto = await prisma.producto.create({
            data: {
                nombre,
                marca,
                precioMayorista: precio_mayorista,
                precioMinorista: precio_minorista,
                categoria
            }
        });
        
        if (variantes && variantes.length > 0) {
            await prisma.variante.createMany({
                data: variantes.map(v => ({
                    productoId: producto.id,
                    sku: v.sku,
                    color: v.color,
                    talla: v.talla,
                    stockActual: v.stock_actual || 0,
                    stockMinimo: v.stock_minimo || 0
                }))
            });
        }
        
        res.json({ id: producto.id, mensaje: 'Producto creado exitosamente' });
    } catch (err) {
        return res.status(500).json({ error: 'Error al crear producto' });
    }
});

router.put('/variantes/:id/stock', verificarToken, soloAdmin, async (req, res) => {
    const { stock_actual } = req.body;
    const varianteId = parseInt(req.params.id);
    
    try {
        await prisma.variante.update({
            where: { id: varianteId },
            data: { stockActual: stock_actual }
        });
        res.json({ mensaje: 'Stock actualizado correctamente' });
    } catch (err) {
        return res.status(500).json({ error: 'Error al actualizar stock' });
    }
});

router.delete('/variantes/:id', verificarToken, soloAdmin, async (req, res) => {
    const varianteId = parseInt(req.params.id);
    try {
        await prisma.variante.delete({
            where: { id: varianteId }
        });
        res.json({ mensaje: 'Variante eliminada correctamente' });
    } catch (err) {
        return res.status(500).json({ error: 'Error al eliminar variante' });
    }
});

router.get('/buscar', verificarToken, async (req, res) => {
    const q = req.query.q || '';
    try {
        const productos = await prisma.producto.findMany({
            where: {
                OR: [
                    { nombre: { contains: q, mode: 'insensitive' } },
                    { variantes: { some: { sku: { contains: q } } } },
                    { variantes: { some: { talla: { contains: q } } } }
                ]
            },
            include: {
                variantes: true
            }
        });
        
        const result = productos.flatMap(p =>
            p.variantes.map(v => ({
                producto_id: p.id,
                nombre: p.nombre,
                marca: p.marca,
                precio_mayorista: p.precioMayorista,
                precio_minorista: p.precioMinorista,
                variante_id: v.id,
                sku: v.sku,
                color: v.color,
                talla: v.talla,
                stock_actual: v.stockActual
            }))
        );
        
        res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error en la búsqueda' });
    }
});

router.get('/:id', verificarToken, async (req, res) => {
    const productId = parseInt(req.params.id);
    try {
        const producto = await prisma.producto.findUnique({
            where: { id: productId },
            include: { variantes: true }
        });
        
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        
        res.json({
            id: producto.id,
            nombre: producto.nombre,
            marca: producto.marca,
            precio_mayorista: producto.precioMayorista,
            precio_minorista: producto.precioMinorista,
            categoria: producto.categoria,
            variantes: producto.variantes
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error al obtener producto' });
    }
});

router.get('/:id/imagenes', verificarToken, async (req, res) => {
    const productId = parseInt(req.params.id);
    try {
        const imagenes = await prisma.productoImagen.findMany({
            where: { productoId: productId }
        });
        res.json(imagenes);
    } catch (err) {
        return res.status(500).json({ error: 'Error al obtener imágenes' });
    }
});

module.exports = router;
