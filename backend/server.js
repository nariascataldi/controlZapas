const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';
const vercelAppName = process.env.VERCEL_PROJECT_PRODUCTION_URL?.split('.')[0];

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
];

if (vercelAppName) {
    allowedOrigins.push(`https://${vercelAppName}.vercel.app`);
}

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? allowedOrigins
        : true,
    credentials: true
};

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'http://localhost:3000', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://*.supabase.co', 'https://cdn.jsdelivr.net'],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Demasiadas solicitudes, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos de login, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

app.use('/api', globalLimiter);

app.use('/api/auth', authLimiter, require('./routes/auth').router);
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/productos', require('./routes/imagenes'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/export', require('./routes/export'));

if (isVercel) {
    app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
} else {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });
}

const prisma = require('./database');

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'controlZapas API is running', database: 'PostgreSQL' });
});

async function crearAdminPorDefecto() {
    const adminExists = await prisma.usuario.findFirst();
    if (!adminExists) {
        const adminPass = 'admin123';
        const hash = bcrypt.hashSync(adminPass, 10);
        await prisma.usuario.create({
            data: {
                nombre: 'admin',
                passwordHash: hash,
                rol: 'VENDEDOR',
                porcentajeComision: 0
            }
        });
        console.log('Usuario administrador por defecto creado: admin / admin123');
    }
}

// Routes registered above (lines 72-78) — duplicate block removed

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

if (!isVercel && require.main === module) {
    crearAdminPorDefecto().then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor de controlZapas corriendo en http://localhost:${PORT}`);
        });
    });
}
