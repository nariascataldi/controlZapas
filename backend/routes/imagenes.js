const express = require('express');
const router = express.Router();
const { upload, deleteImage, getPublicIdFromUrl } = require('../services/cloudinary');
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.get('/:id/imagenes', verificarToken, async (req, res) => {
    const productoId = parseInt(req.params.id);
    try {
        const imagenes = await prisma.productoImagen.findMany({
            where: { productoId },
            orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }]
        });
        res.json(imagenes);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/:id/imagenes', verificarToken, soloAdmin, upload.array('imagenes', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const productoId = parseInt(req.params.id);

    try {
        const producto = await prisma.producto.findUnique({ where: { id: productoId } });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

        const countResult = await prisma.productoImagen.count({ where: { productoId } });
        const esPrimera = countResult === 0;

        const maxOrden = await prisma.productoImagen.aggregate({
            where: { productoId },
            _max: { orden: true }
        });

        let orden = (maxOrden._max.orden || 0) + 1;
        const insertadas = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const esPrincipal = esPrimera && i === 0;

            const imagen = await prisma.productoImagen.create({
                data: {
                    productoId,
                    nombreArchivo: file.originalname,
                    ruta: file.path,
                    publicId: file.filename,
                    esPrincipal,
                    orden: orden + i
                }
            });

            insertadas.push({
                nombre_archivo: imagen.nombreArchivo,
                ruta: imagen.ruta,
                es_principal: imagen.esPrincipal
            });
        }

        res.status(201).json({
            message: `${insertadas.length} imagen(es) subida(s) a Cloudinary`,
            imagenes: insertadas
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/:id/imagenes-url', verificarToken, soloAdmin, async (req, res) => {
    const { url } = req.body;
    const productoId = parseInt(req.params.id);

    if (!url) {
        return res.status(400).json({ error: 'URL de imagen requerida' });
    }

    try {
        const producto = await prisma.producto.findUnique({ where: { id: productoId } });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

        const countResult = await prisma.productoImagen.count({ where: { productoId } });
        const esPrimera = countResult === 0;

        const maxOrden = await prisma.productoImagen.aggregate({
            where: { productoId },
            _max: { orden: true }
        });

        const imagen = await prisma.productoImagen.create({
            data: {
                productoId,
                nombreArchivo: url.split('/').pop() || 'imagen-url',
                ruta: url,
                publicId: null,
                esPrincipal: esPrimera,
                orden: (maxOrden._max.orden || 0) + 1
            }
        });

        res.status(201).json({
            message: 'Imagen por URL agregada',
            imagen: {
                nombre_archivo: imagen.nombreArchivo,
                ruta: imagen.ruta,
                es_principal: imagen.esPrincipal
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id/imagenes/:imgId/principal', verificarToken, soloAdmin, async (req, res) => {
    const productoId = parseInt(req.params.id);
    const imgId = parseInt(req.params.imgId);

    try {
        await prisma.productoImagen.updateMany({
            where: { productoId },
            data: { esPrincipal: false }
        });

        const imagen = await prisma.productoImagen.update({
            where: { id: imgId },
            data: { esPrincipal: true }
        });

        res.json({ message: 'Imagen marcada como principal' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/imagenes/:imgId', verificarToken, soloAdmin, async (req, res) => {
    const imgId = parseInt(req.params.imgId);
    const productoId = parseInt(req.params.id);

    try {
        const img = await prisma.productoImagen.findFirst({
            where: { id: imgId, productoId }
        });

        if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });

        if (img.publicId) {
            await deleteImage(img.publicId);
        }

        await prisma.productoImagen.delete({ where: { id: imgId } });
        res.json({ message: 'Imagen eliminada de Cloudinary' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
