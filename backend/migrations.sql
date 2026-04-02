-- controlZapas PostgreSQL Migration Script
-- Ejecutar en Render PostgreSQL

BEGIN;

-- ============================================
-- SCHEMA
-- ============================================

-- Create Enum Rol
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'VENDEDOR');

-- Table: usuarios
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'VENDEDOR',
    "porcentaje_comision" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usuarios_nombre_key" UNIQUE ("nombre")
);

-- Table: productos
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "precio_mayorista" DOUBLE PRECISION NOT NULL,
    "precio_minorista" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- Table: variantes
CREATE TABLE "variantes" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT,
    "talla" TEXT NOT NULL,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "variantes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "variantes_sku_key" UNIQUE ("sku"),
    CONSTRAINT "variantes_producto_id_fkey" FOREIGN KEY ("producto_id") 
        REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: clientes
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- Table: ventas
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" INTEGER,
    "vendedor_id" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "comision_calculada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metodo_pago" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pagado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") 
        REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") 
        REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table: venta_detalles
CREATE TABLE "venta_detalles" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "variante_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "venta_detalles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "venta_detalles_venta_id_fkey" FOREIGN KEY ("venta_id") 
        REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "venta_detalles_variante_id_fkey" FOREIGN KEY ("variante_id") 
        REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table: producto_imagenes
CREATE TABLE "producto_imagenes" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "public_id" TEXT,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "producto_imagenes_producto_id_fkey" FOREIGN KEY ("producto_id") 
        REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- SEED - Datos Iniciales
-- ============================================

-- Insertar usuario administrador por defecto
-- Password: admin123 (hash bcrypt)
INSERT INTO "usuarios" ("nombre", "password_hash", "rol", "porcentaje_comision")
VALUES ('admin', '$2b$10$YourHashHereReplaceThisWithActualHash', 'ADMIN', 0);

-- Insertar usuario vendedor de ejemplo
INSERT INTO "usuarios" ("nombre", "password_hash", "rol", "porcentaje_comision")
VALUES ('vendedor', '$2b$10$YourHashHereReplaceThisWithActualHash', 'VENDEDOR', 10);

-- Insertar cliente de ejemplo
INSERT INTO "clientes" ("nombre", "contacto")
VALUES ('Cliente General', 'Sin especificar');

COMMIT;

-- ============================================
-- NOTAS PARA DEPLOY
-- ============================================
-- 1. Crear base de datos en Render PostgreSQL
-- 2. Ejecutar este script en la base de datos
-- 3. Actualizar password_hash del admin con hash real:
--    bcrypt.hashSync('admin123', 10)
-- 4. Configurar DATABASE_URL en Render
