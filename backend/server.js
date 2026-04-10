const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config();

// Validate critical environment variables before starting
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('═══════════════════════════════════════════════════');
  console.error('❌ MISSING ENVIRONMENT VARIABLES');
  console.error('═══════════════════════════════════════════════════');
  console.error('The following environment variables are required:');
  missingEnvVars.forEach(varName => {
    console.error(`  • ${varName}`);
  });
  console.error('');
  console.error('Please configure them in:');
  console.error('  • Vercel Dashboard → Settings → Environment Variables');
  console.error('  • Or in your local .env file');
  console.error('═══════════════════════════════════════════════════');
  
  // In production/Vercel, don't crash - export app with error handler
  if (process.env.VERCEL === '1') {
    const express = require('express');
    const app = express();
    app.use((req, res) => {
      res.status(503).json({
        error: 'Service unavailable: Missing environment configuration',
        missing: missingEnvVars,
        help: 'Please contact support or check Vercel environment variables'
      });
    });
    module.exports = app;
    return;
  }
  
  // In local development, crash with helpful error
  process.exit(1);
}

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

app.get('/api/health', async (req, res) => {
    try {
        // Check if we have a valid prisma client
        if (!prisma || !prisma.$queryRaw) {
            return res.status(503).json({
                status: 'ERROR',
                message: 'Database client not initialized',
                database: 'Not connected',
                env: process.env.NODE_ENV || 'not set',
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                hasJwtSecret: !!process.env.JWT_SECRET,
                hint: 'Please configure environment variables in Vercel dashboard'
            });
        }

        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'OK',
            message: 'controlZapas API is running',
            database: 'Connected (PostgreSQL)',
            env: process.env.NODE_ENV,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasJwtSecret: !!process.env.JWT_SECRET
        });
    } catch (err) {
        console.error('[Health] Database connection failed:', err.message);
        res.status(503).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: err.message,
            env: process.env.NODE_ENV || 'not set',
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hint: 'Verify DATABASE_URL in Vercel environment variables'
        });
    }
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
