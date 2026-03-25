const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Login de usuario
router.post('/login', (req, res) => {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos' });
    }

    const query = `SELECT * FROM usuarios WHERE nombre = ?`;
    db.get(query, [nombre], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, rol: user.rol, porcentaje_comision: user.porcentaje_comision },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol,
                porcentaje_comision: user.porcentaje_comision
            }
        });
    });
});

// Middleware auxiliar de autenticación (exportado para usar en otras rutas)
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
};

const soloAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso denegado, solo administradores' });
    }
};

module.exports = {
    router,
    verificarToken,
    soloAdmin
};
