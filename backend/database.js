const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbFile = process.env.NODE_ENV === 'test' ? 'database_test.db' : 'database.db';
const dbPath = path.resolve(__dirname, dbFile);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite (database.db)');
        initDB();
    }
});

function initDB() {
    db.serialize(() => {
        // Habilitar foreign keys
        db.run(`PRAGMA foreign_keys = ON;`);

        // Tabla Usuarios
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT CHECK(rol IN ('ADMIN', 'VENDEDOR')) NOT NULL,
            porcentaje_comision REAL DEFAULT 0
        )`);

        // Tabla Productos
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            marca TEXT,
            precio_mayorista REAL NOT NULL,
            precio_minorista REAL NOT NULL,
            categoria TEXT
        )`);

        // Tabla Variantes (SKU)
        db.run(`CREATE TABLE IF NOT EXISTS variantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            color TEXT,
            talla TEXT NOT NULL,
            stock_actual INTEGER NOT NULL DEFAULT 0,
            stock_minimo INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )`);

        // Tabla Clientes
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            contacto TEXT
        )`);

        // Tabla Ventas
        db.run(`CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            cliente_id INTEGER,
            vendedor_id INTEGER NOT NULL,
            total REAL NOT NULL,
            comision_calculada REAL NOT NULL DEFAULT 0,
            metodo_pago TEXT,
            estado TEXT DEFAULT 'Pagado',
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
        )`);

        // Tabla Detalle_Venta
        db.run(`CREATE TABLE IF NOT EXISTS venta_detalles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER NOT NULL,
            variante_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
            FOREIGN KEY (variante_id) REFERENCES variantes(id)
        )`);

        // Tabla Imágenes de Producto (Galería)
        db.run(`CREATE TABLE IF NOT EXISTS producto_imagenes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            nombre_archivo TEXT NOT NULL,
            ruta TEXT NOT NULL,
            es_principal INTEGER DEFAULT 0,
            orden INTEGER DEFAULT 0,
            fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )`);

        console.log('Tablas inicializadas correctamente.');
        
        // Crear el administrador por defecto si no existe
        crearAdminPorDefecto();
    });
}

function crearAdminPorDefecto() {
    const dbQuery = `SELECT id FROM usuarios WHERE rol = 'ADMIN' LIMIT 1`;
    db.get(dbQuery, [], (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (!row) {
            const adminPass = 'admin123';
            const hash = bcrypt.hashSync(adminPass, 10);
            db.run(`INSERT INTO usuarios (nombre, password_hash, rol, porcentaje_comision) VALUES (?, ?, ?, ?)`,
                ['admin', hash, 'ADMIN', 0], function(err) {
                    if (err) {
                        console.error('Error creando admin:', err.message);
                    } else {
                        console.log('Usuario administrador por defecto creado: admin / admin123');
                    }
                }
            );
        }
    });
}

module.exports = db;
