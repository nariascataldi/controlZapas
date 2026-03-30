const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `prod-${req.params.id}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG, WebP y GIF.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

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
                    ruta: `/uploads/${file.filename}`,
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
            message: `${insertadas.length} imagen(es) subida(s)`,
            imagenes: insertadas
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

        const filePath = path.join(__dirname, '..', img.ruta);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.productoImagen.delete({ where: { id: imgId } });
        res.json({ message: 'Imagen eliminada' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
