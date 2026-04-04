const express = require('express');
const cors = require('cors');
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
    'https://controlzapas.onrender.com',
    'https://controlzapas-api.onrender.com',
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

app.use(cors(corsOptions));
app.use(express.json());

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

const prisma = require('./prisma');

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'controlZapas API is running', database: 'PostgreSQL' });
});

async function crearAdminPorDefecto() {
    const adminExists = await prisma.usuario.findFirst({
        where: { rol: 'ADMIN' }
    });

    if (!adminExists) {
        const adminPass = 'admin123';
        const hash = bcrypt.hashSync(adminPass, 10);
        await prisma.usuario.create({
            data: {
                nombre: 'admin',
                passwordHash: hash,
                rol: 'ADMIN',
                porcentajeComision: 0
            }
        });
        console.log('Usuario administrador por defecto creado: admin / admin123');
    }
}

app.use('/api/auth', require('./routes/auth').router);
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/productos', require('./routes/imagenes'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/export', require('./routes/export'));

if (!isVercel) {
    if (require.main === module) {
        crearAdminPorDefecto().then(() => {
            app.listen(PORT, () => {
                console.log(`Servidor de controlZapas corriendo en http://localhost:${PORT}`);
            });
        });
    }
} else {
    module.exports = app;
}
