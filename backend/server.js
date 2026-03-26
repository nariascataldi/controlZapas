const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Redirigir la raíz a index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Archivo de base de datos
const db = require('./database');

// Rutas básicas (placeholder)
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'controlZapas API is running' });
});

// Importar y usar rutas específicas (serán implementadas después)
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/productos', require('./routes/imagenes'));
app.use('/api/stats', require('./routes/stats'));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor de controlZapas corriendo en http://localhost:${PORT}`);
});
