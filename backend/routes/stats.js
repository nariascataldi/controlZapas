const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verificarToken, soloAdmin } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toCamel(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

router.get('/kpis', verificarToken, soloAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: ventas, error } = await supabase
      .from('ventas')
      .select('total, comision_calculada')
      .gte('fecha', startOfMonth.toISOString());

    if (error) throw error;

    let ventasTotalesMes = 0;
    let comisionesPorPagar = 0;

    if (ventas) {
      ventasTotalesMes = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
      comisionesPorPagar = ventas.reduce((sum, v) => sum + (v.comision_calculada || 0), 0);
    }

    const gananciasMes = ventasTotalesMes - comisionesPorPagar;

    res.json({
      ventas_totales_mes: ventasTotalesMes,
      ganancias_netas_mes: gananciasMes,
      comisiones_por_pagar: comisionesPorPagar
    });
  } catch (error) {
    console.error('Error calculando KPIs:', error);
    res.status(500).json({ error: 'Error interno obteniendo KPIs' });
  }
});

router.get('/rendimiento-vendedores', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, porcentaje_comision')
      .eq('rol', 'VENDEDOR');

    if (error) throw error;

    const rendimiento = await Promise.all(usuarios.map(async (u) => {
      const { data: ventas } = await supabase
        .from('ventas')
        .select('total, comision_calculada')
        .eq('vendedor_id', u.id);

      const cantidad = ventas?.length || 0;
      const total_vendido = ventas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
      const total_comisiones = ventas?.reduce((sum, v) => sum + (v.comision_calculada || 0), 0) || 0;

      return {
        id: u.id,
        nombre: u.nombre,
        porcentaje_comision: u.porcentaje_comision,
        cantidad_ventas: cantidad,
        total_vendido,
        total_comisiones
      };
    }));

    rendimiento.sort((a, b) => b.total_vendido - a.total_vendido);
    res.json(rendimiento);
  } catch (error) {
    console.error('Error obteniendo rendimiento de vendedores:', error);
    res.status(500).json({ error: 'Error interno obteniendo datos de vendedores' });
  }
});

router.get('/historial-clientes', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id, nombre, contacto');

    if (error) throw error;

    const historial = await Promise.all(clientes.map(async (c) => {
      const { data: ventas } = await supabase
        .from('ventas')
        .select('total, fecha')
        .eq('cliente_id', c.id);

      if (!ventas || ventas.length === 0) return null;

      const cantidad_compras = ventas.length;
      const total_gastado = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
      const ultima_compra = ventas.reduce((max, v) => {
        const fecha = new Date(v.fecha);
        return fecha > max ? fecha : max;
      }, new Date(0));

      return {
        id: c.id,
        nombre: c.nombre,
        contacto: c.contacto,
        cantidad_compras,
        total_gastado,
        ultima_compra: ultima_compra.toISOString()
      };
    }));

    const filtered = historial.filter(c => c !== null);
    filtered.sort((a, b) => b.total_gastado - a.total_gastado);

    res.json(filtered);
  } catch (error) {
    console.error('Error obteniendo historial de clientes:', error);
    res.status(500).json({ error: 'Error interno obteniendo datos de clientes' });
  }
});

router.get('/top-productos', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { data: detalles, error } = await supabase
      .from('venta_detalles')
      .select(`
        cantidad,
        precio_unitario,
        variante:variantes (
          producto:productos (
            id,
            nombre,
            marca
          )
        )
      `);

    if (error) throw error;

    const productosMap = {};

    if (detalles) {
      detalles.forEach(d => {
        const variante = d.variante;
        const producto = variante?.producto;
        if (!producto) return;

        if (!productosMap[producto.id]) {
          productosMap[producto.id] = {
            nombre: producto.nombre,
            marca: producto.marca,
            unidades_vendidas: 0,
            ingresos_generados: 0
          };
        }
        productosMap[producto.id].unidades_vendidas += d.cantidad;
        productosMap[producto.id].ingresos_generados += d.cantidad * d.precio_unitario;
      });
    }

    const top = Object.values(productosMap)
      .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
      .slice(0, 5);

    res.json(top);
  } catch (error) {
    console.error('Error obteniendo top productos:', error);
    res.status(500).json({ error: 'Error interno obteniendo top productos' });
  }
});

router.get('/inventario', verificarToken, async (req, res) => {
  try {
    const esAdmin = req.usuario?.rol === 'ADMIN';

    if (!esAdmin) {
      const hace30dias = new Date();
      hace30dias.setDate(hace30dias.getDate() - 30);

      const [{ count: variantes }, { data: ventasUltimoMes }] = await Promise.all([
        supabase.from('variantes').select('*', { count: 'exact', head: true }),
        supabase.from('venta_detalles')
          .select('cantidad')
          .gte('venta(fecha)', hace30dias.toISOString())
      ]);

      const unidadesVendidas = ventasUltimoMes?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
      const rotacion = variantes > 0 ? (unidadesVendidas / variantes).toFixed(1) : 0;

      return res.json({ rotacion: parseFloat(rotacion) });
    }

    const { data: variantes, error: varError } = await supabase
      .from('variantes')
      .select('stock_actual, stock_minimo, producto(precio_mayorista, precio_minorista)');

    if (varError) throw varError;

    let totalSku = 0;
    let valorInventario = 0;
    let stockBajo = 0;

    if (variantes) {
      totalSku = variantes.length;
      variantes.forEach(v => {
        const precio = v.producto?.precio_mayorista || v.producto?.precio_minorista || 0;
        valorInventario += (v.stock_actual || 0) * precio;
        if ((v.stock_actual || 0) <= (v.stock_minimo || 0)) stockBajo++;
      });
    }

    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);

    const { data: ventasUltimoMes } = await supabase
      .from('venta_detalles')
      .select('cantidad')
      .gte('venta(fecha)', hace30dias.toISOString());

    const unidadesVendidas = ventasUltimoMes?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
    const rotacion = totalSku > 0 ? (unidadesVendidas / totalSku).toFixed(1) : 0;

    res.json({
      totalSku,
      valorInventario: Math.round(valorInventario * 100) / 100,
      stockBajo,
      rotacion: parseFloat(rotacion)
    });
  } catch (error) {
    console.error('Error calculando stats inventario:', error);
    res.status(500).json({ error: 'Error interno obteniendo stats de inventario' });
  }
});

module.exports = router;
