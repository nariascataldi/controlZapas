-- ============================================
-- RLS con Políticas Basadas en JWT
-- Fecha: 2026-04-08
-- Descripción: Implementa Row Level Security usando claims del JWT
-- Claims esperados: id, rol, porcentajeComision
-- ============================================

-- ============================================
-- 1. ELIMINAR POLÍTICAS ANTERIORES (permissive)
-- ============================================
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

DROP POLICY IF EXISTS "productos_select" ON public.productos;
DROP POLICY IF EXISTS "productos_insert" ON public.productos;
DROP POLICY IF EXISTS "productos_update" ON public.productos;
DROP POLICY IF EXISTS "productos_delete" ON public.productos;

DROP POLICY IF EXISTS "variantes_select" ON public.variantes;
DROP POLICY IF EXISTS "variantes_insert" ON public.variantes;
DROP POLICY IF EXISTS "variantes_update" ON public.variantes;
DROP POLICY IF EXISTS "variantes_delete" ON public.variantes;

DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;

DROP POLICY IF EXISTS "ventas_select" ON public.ventas;
DROP POLICY IF EXISTS "ventas_insert" ON public.ventas;
DROP POLICY IF EXISTS "ventas_update" ON public.ventas;
DROP POLICY IF EXISTS "ventas_delete" ON public.ventas;

DROP POLICY IF EXISTS "venta_detalles_select" ON public.venta_detalles;
DROP POLICY IF EXISTS "venta_detalles_insert" ON public.venta_detalles;
DROP POLICY IF EXISTS "venta_detalles_update" ON public.venta_detalles;
DROP POLICY IF EXISTS "venta_detalles_delete" ON public.venta_detalles;

DROP POLICY IF EXISTS "producto_imagenes_select" ON public.producto_imagenes;
DROP POLICY IF EXISTS "producto_imagenes_insert" ON public.producto_imagenes;
DROP POLICY IF EXISTS "producto_imagenes_update" ON public.producto_imagenes;
DROP POLICY IF EXISTS "producto_imagenes_delete" ON public.producto_imagenes;

-- ============================================
-- 2. POLÍTICAS PARA USUARIOS (solo ADMIN)
-- ============================================
CREATE POLICY "usuarios_select" ON public.usuarios 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "usuarios_insert" ON public.usuarios 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "usuarios_update" ON public.usuarios 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "usuarios_delete" ON public.usuarios 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 3. POLÍTICAS PARA PRODUCTOS
-- ============================================
CREATE POLICY "productos_select" ON public.productos 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "productos_insert" ON public.productos 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "productos_update" ON public.productos 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "productos_delete" ON public.productos 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 4. POLÍTICAS PARA VARIANTES
-- ============================================
CREATE POLICY "variantes_select" ON public.variantes 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "variantes_insert" ON public.variantes 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "variantes_update" ON public.variantes 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "variantes_delete" ON public.variantes 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 5. POLÍTICAS PARA CLIENTES
-- ============================================
CREATE POLICY "clientes_select" ON public.clientes 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "clientes_insert" ON public.clientes 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "clientes_update" ON public.clientes 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "clientes_delete" ON public.clientes 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 6. POLÍTICAS PARA VENTAS
-- ============================================
CREATE POLICY "ventas_select" ON public.ventas 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN' 
    OR vendedor_id::text = current_setting('request.jwt.claim.id', true)
  );

CREATE POLICY "ventas_insert" ON public.ventas 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "ventas_update" ON public.ventas 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN' 
    OR vendedor_id::text = current_setting('request.jwt.claim.id', true)
  );

CREATE POLICY "ventas_delete" ON public.ventas 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 7. POLÍTICAS PARA VENTA_DETALLES
-- ============================================
CREATE POLICY "venta_detalles_select" ON public.venta_detalles 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN' 
    OR EXISTS (
      SELECT 1 FROM public.ventas v 
      WHERE v.id = venta_detalles.venta_id 
      AND v.vendedor_id::text = current_setting('request.jwt.claim.id', true)
    )
  );

CREATE POLICY "venta_detalles_insert" ON public.venta_detalles 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "venta_detalles_update" ON public.venta_detalles 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "venta_detalles_delete" ON public.venta_detalles 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

-- ============================================
-- 8. POLÍTICAS PARA PRODUCTO_IMAGENES
-- ============================================
CREATE POLICY "producto_imagenes_select" ON public.producto_imagenes 
  FOR SELECT USING (
    current_setting('request.jwt.claim.role', true) IS NOT NULL
  );

CREATE POLICY "producto_imagenes_insert" ON public.producto_imagenes 
  FOR INSERT WITH CHECK (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "producto_imagenes_update" ON public.producto_imagenes 
  FOR UPDATE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );

CREATE POLICY "producto_imagenes_delete" ON public.producto_imagenes 
  FOR DELETE USING (
    current_setting('request.jwt.claim.role', true)::text = 'ADMIN'
  );
