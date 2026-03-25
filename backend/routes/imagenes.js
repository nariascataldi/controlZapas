const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verificarToken, verificarRol } = require('./auth');

// --- Configuración de Multer ---
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
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB máx
});

// --- GET /api/productos/:id/imagenes → Listar imágenes de un producto ---
router.get('/:id/imagenes', verificarToken, (req, res) => {
    db.all(
        `SELECT * FROM producto_imagenes WHERE producto_id = ? ORDER BY es_principal DESC, orden ASC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// --- POST /api/productos/:id/imagenes → Subir imagen(es) ---
router.post('/:id/imagenes', verificarToken, verificarRol('ADMIN'), upload.array('imagenes', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
    }

    // Verificar que el producto existe
    db.get('SELECT id FROM productos WHERE id = ?', [req.params.id], (err, producto) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

        // Obtener el orden máximo actual
        db.get('SELECT COALESCE(MAX(orden), -1) as maxOrden FROM producto_imagenes WHERE producto_id = ?',
            [req.params.id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });

                let orden = (row.maxOrden || 0) + 1;
                const insertadas = [];

                // Verificar si ya tiene imágenes (para marcar la primera como principal)
                db.get('SELECT COUNT(*) as count FROM producto_imagenes WHERE producto_id = ?',
                    [req.params.id], (err, countRow) => {
                        if (err) return res.status(500).json({ error: err.message });

                        const esPrimera = countRow.count === 0;

                        const stmt = db.prepare(
                            `INSERT INTO producto_imagenes (producto_id, nombre_archivo, ruta, es_principal, orden)
                             VALUES (?, ?, ?, ?, ?)`
                        );

                        req.files.forEach((file, index) => {
                            const esPrincipal = esPrimera && index === 0 ? 1 : 0;
                            stmt.run(
                                req.params.id,
                                file.originalname,
                                `/uploads/${file.filename}`,
                                esPrincipal,
                                orden + index
                            );
                            insertadas.push({
                                nombre_archivo: file.originalname,
                                ruta: `/uploads/${file.filename}`,
                                es_principal: esPrincipal
                            });
                        });

                        stmt.finalize((err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.status(201).json({
                                message: `${insertadas.length} imagen(es) subida(s)`,
                                imagenes: insertadas
                            });
                        });
                    }
                );
            }
        );
    });
});

// --- PUT /api/productos/:id/imagenes/:imgId/principal → Marcar como imagen principal ---
router.put('/:id/imagenes/:imgId/principal', verificarToken, verificarRol('ADMIN'), (req, res) => {
    // Primero quitar la principal actual
    db.run('UPDATE producto_imagenes SET es_principal = 0 WHERE producto_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Marcar la nueva principal
        db.run('UPDATE producto_imagenes SET es_principal = 1 WHERE id = ? AND producto_id = ?',
            [req.params.imgId, req.params.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Imagen no encontrada' });
                res.json({ message: 'Imagen marcada como principal' });
            }
        );
    });
});

// --- DELETE /api/productos/:id/imagenes/:imgId → Eliminar imagen ---
router.delete('/:id/imagenes/:imgId', verificarToken, verificarRol('ADMIN'), (req, res) => {
    db.get('SELECT * FROM producto_imagenes WHERE id = ? AND producto_id = ?',
        [req.params.imgId, req.params.id], (err, img) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });

            // Eliminar archivo físico
            const filePath = path.join(__dirname, '..', img.ruta);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Eliminar registro de la DB
            db.run('DELETE FROM producto_imagenes WHERE id = ?', [img.id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Imagen eliminada' });
            });
        }
    );
});

module.exports = router;
