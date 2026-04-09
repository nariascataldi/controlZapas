const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verificarToken, soloAdmin } = require('./auth');

router.get('/kpis', verificarToken, soloAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ventas = await prisma.venta.findMany({
      where: {
        fecha: { gte: startOfMonth }
      },
      select: { total: true, comisionCalculada: true }
    });

    let ventasTotalesMes = 0;
    let comisionesPorPagar = 0;

    if (ventas) {
      ventasTotalesMes = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
      comisionesPorPagar = ventas.reduce((sum, v) => sum + (v.comisionCalculada || 0), 0);
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
    const usuarios = await prisma.usuario.findMany({
      where: { rol: 'VENDEDOR' },
      select: { id: true, nombre: true, porcentajeComision: true }
    });

    const rendimiento = await Promise.all(usuarios.map(async (u) => {
      const ventas = await prisma.venta.findMany({
        where: { vendedorId: u.id },
        select: { total: true, comisionCalculada: true }
      });

      const cantidad = ventas?.length || 0;
      const total_vendido = ventas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
      const total_comisiones = ventas?.reduce((sum, v) => sum + (v.comisionCalculada || 0), 0) || 0;

      return {
        id: u.id,
        nombre: u.nombre,
        porcentaje_comision: u.porcentajeComision,
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
    const clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true, contacto: true }
    });

    const historial = await Promise.all(clientes.map(async (c) => {
      const ventas = await prisma.venta.findMany({
        where: { clienteId: c.id },
        select: { total: true, fecha: true }
      });

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
    const detalles = await prisma.ventaDetalle.findMany({
      select: {
        cantidad: true,
        precioUnitario: true,
        variante: {
          include: {
            producto: {
              select: { id: true, nombre: true, marca: true }
            }
          }
        }
      }
    });

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
        productosMap[producto.id].ingresos_generados += d.cantidad * d.precioUnitario;
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

      const [variantesCount, ventasUltimoMes] = await Promise.all([
        prisma.variante.count(),
        prisma.ventaDetalle.findMany({
          where: {
            venta: { fecha: { gte: hace30dias } }
          },
          select: { cantidad: true }
        })
      ]);

      const unidadesVendidas = ventasUltimoMes?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
      const rotacion = variantesCount > 0 ? (unidadesVendidas / variantesCount).toFixed(1) : 0;

      return res.json({ rotacion: parseFloat(rotacion) });
    }

    const variantes = await prisma.variante.findMany({
      select: {
        stockActual: true,
        stockMinimo: true,
        producto: {
          select: { precioMayorista: true, precioMinorista: true }
        }
      }
    });

    let totalSku = 0;
    let valorInventario = 0;
    let stockBajo = 0;

    if (variantes) {
      totalSku = variantes.length;
      variantes.forEach(v => {
        const precio = v.producto?.precioMayorista || v.producto?.precioMinorista || 0;
        valorInventario += (v.stockActual || 0) * precio;
        if ((v.stockActual || 0) <= (v.stockMinimo || 0)) stockBajo++;
      });
    }

    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);

    const ventasUltimoMes = await prisma.ventaDetalle.findMany({
      where: {
        venta: { fecha: { gte: hace30dias } }
      },
      select: { cantidad: true }
    });

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