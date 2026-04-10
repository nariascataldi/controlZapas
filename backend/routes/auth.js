const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

router.post('/login', async (req, res) => {
    const { nombre, password } = req.body;
    console.log('[Auth] Login attempt for:', nombre);

    // Check if prisma is properly initialized
    if (!prisma || !prisma.usuario) {
        console.error('[Auth] ERROR: Prisma client not properly initialized');
        return res.status(503).json({ 
            error: 'Base de datos no configurada',
            hint: 'Please configure DATABASE_URL in Vercel environment variables'
        });
    }

    // Diagnostic checks
    console.log('[Auth] JWT_SECRET defined:', !!process.env.JWT_SECRET);
    console.log('[Auth] DATABASE_URL defined:', !!process.env.DATABASE_URL);
    console.log('[Auth] Prisma object exists:', !!prisma);
    if (prisma) console.log('[Auth] Prisma users model exists:', !!prisma.usuario);

    if (!nombre || !password) {
        return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos' });
    }

    try {
        console.log('[Auth] Executing prisma.usuario.findUnique...');
        const user = await prisma.usuario.findUnique({
            where: { nombre }
        });
        console.log('[Auth] DB lookup result:', !!user);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        console.log('[Auth] Comparing passwords...');
        const validPassword = bcrypt.compareSync(password, user.passwordHash);
        if (!validPassword) {
            console.log('[Auth] Invalid password');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('[Auth] ERROR: JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ error: 'Error de configuración en el servidor' });
        }

        console.log('[Auth] Signing token...');
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, rol: user.rol, porcentajeComision: user.porcentajeComision },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        console.log('[Auth] Login success:', user.nombre);
        res.json({
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol,
                porcentajeComision: user.porcentajeComision
            }
        });
    } catch (err) {
        console.error('[Auth] CRITICAL ERROR during login process:');
        console.error(err.stack);
        return res.status(500).json({ 
            error: 'Error interno del servidor', 
            details: process.env.NODE_ENV === 'development' ? err.message : undefined 
        });
    }
});

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1];
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
