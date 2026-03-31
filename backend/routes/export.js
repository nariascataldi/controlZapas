const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verificarToken } = require('./auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

async function getFilteredSales(user, filters) {
    const { cliente, producto, sale_id, desde, hasta, metodo_pago, estado, vendedor_id, ids } = filters;
    
    const where = {};

    if (user.rol !== 'ADMIN') {
        where.vendedorId = user.id;
    } else if (vendedor_id) {
        where.vendedorId = parseInt(vendedor_id);
    }

    if (ids) {
        const idArray = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (idArray.length > 0) {
            where.id = { in: idArray };
        }
    }

    if (cliente) {
        where.cliente = { nombre: { contains: cliente, mode: 'insensitive' } };
    }

    if (sale_id) {
        where.id = parseInt(sale_id);
    }

    if (desde || hasta) {
        where.fecha = {};
        if (desde) where.fecha.gte = new Date(desde);
        if (hasta) where.fecha.lte = new Date(hasta + ' 23:59:59');
    }

    if (metodo_pago) {
        where.metodoPago = metodo_pago;
    }

    if (estado) {
        where.estado = estado;
    }

    const ventas = await prisma.venta.findMany({
        where,
        include: {
            cliente: true,
            vendedor: { select: { nombre: true } },
            detalles: {
                include: {
                    variante: {
                        include: { producto: true }
                    }
                }
            }
        },
        orderBy: { fecha: 'desc' }
    });

    return ventas.map(v => ({
        id: v.id,
        fecha: v.fecha,
        total: v.total,
        comision_calculada: v.comisionCalculada,
        metodo_pago: v.metodoPago,
        estado: v.estado,
        cliente: v.cliente?.nombre,
        vendedor: v.vendedor?.nombre,
        productos: v.detalles.map(d => d.variante?.producto?.nombre).filter(Boolean).join(', '),
        cantidad_total: v.detalles.reduce((sum, d) => sum + d.cantidad, 0)
    }));
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

router.get('/csv', verificarToken, async (req, res) => {
    try {
        const sales = await getFilteredSales(req.user, req.query);
        let csv = 'ID,Venta,Fecha,Cliente,Productos,Cantidad,Total,Comision,Metodo Pago,Estado,Vendedor\n';
        sales.forEach(s => {
            csv += `"${s.id}","#${s.id}","${formatDate(s.fecha)}","${s.cliente}","${s.productos || ''}","${s.cantidad_total || 0}","$${s.total.toFixed(2)}","$${s.comision_calculada.toFixed(2)}","${s.metodo_pago || ''}","${s.estado || ''}","${s.vendedor}"\n`;
        });
        
        const totalVentas = sales.length;
        const totalIngresos = sales.reduce((acc, s) => acc + s.total, 0);
        csv += `\n"","","","","","TOTAL:","$${totalIngresos.toFixed(2)}","","",""\n`;
        csv += `"","","","","","TOTAL VENTAS:","${totalVentas}","","",""\n`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csv);
    } catch (e) {
        console.error('Error CSV:', e);
        res.status(500).json({ error: 'Error generando CSV' });
    }
});

router.get('/excel', verificarToken, async (req, res) => {
    try {
        const sales = await getFilteredSales(req.user, req.query);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ventas');
        
        worksheet.columns = [
            { header: 'Nº Venta', key: 'id', width: 12 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Cliente', key: 'cliente', width: 22 },
            { header: 'Productos', key: 'productos', width: 45 },
            { header: 'Cantidad', key: 'cantidad', width: 10 },
            { header: 'Total', key: 'total', width: 14 },
            { header: 'Comisión', key: 'comision', width: 12 },
            { header: 'Método Pago', key: 'metodo_pago', width: 15 },
            { header: 'Estado', key: 'estado', width: 12 },
            { header: 'Vendedor', key: 'vendedor', width: 18 }
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FF0049E6' } };
        worksheet.getRow(1).alignment = { horizontal: 'center' };

        sales.forEach((s, index) => {
            const row = worksheet.addRow({
                id: s.id,
                fecha: formatDate(s.fecha),
                cliente: s.cliente,
                productos: s.productos || '-',
                cantidad: s.cantidad_total || 0,
                total: s.total,
                comision: s.comision_calculada,
                metodo_pago: s.metodo_pago || '-',
                estado: s.estado || 'Pagado',
                vendedor: s.vendedor
            });
            
            if (s.total > 50000) {
                row.fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
            }
            
            row.getCell('total').numFmt = '"$"#,##0.00';
            row.getCell('comision').numFmt = '"$"#,##0.00';
            row.getCell('id').alignment = { horizontal: 'center' };
            row.getCell('cantidad').alignment = { horizontal: 'center' };
        });

        const totalRow = worksheet.addRow({
            id: '',
            fecha: '',
            cliente: '',
            productos: '',
            cantidad: '',
            total: sales.reduce((acc, s) => acc + s.total, 0),
            comision: '',
            metodo_pago: '',
            estado: '',
            vendedor: ''
        });
        totalRow.font = { bold: true };
        totalRow.getCell('total').numFmt = '"$"#,##0.00';
        totalRow.getCell('productos').value = `Total Ventas: ${sales.length}`;

        worksheet.autoFilter = { from: 'A1', to: 'J1' };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Error Excel:', e);
        res.status(500).json({ error: 'Error generando Excel' });
    }
});

router.get('/pdf', verificarToken, async (req, res) => {
    try {
        const sales = await getFilteredSales(req.user, req.query);
        const doc = new PDFDocument({ layout: 'landscape', margin: 25, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.pdf`);
        
        doc.pipe(res);
        
        const totalVentas = sales.length;
        const totalIngresos = sales.reduce((acc, s) => acc + s.total, 0);
        const fechaExport = new Date().toLocaleString('es-AR');
        
        const pageWidth = doc.page.width - 50;
        const startX = 25;
        let startY = 40;
        
        doc.rect(startX, 20, pageWidth, 40).fill('#0049E6');
        doc.fillColor('#FFFFFF')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('controlZapas', startX + 10, startY + 5);
        doc.fontSize(10)
           .font('Helvetica')
           .text('Historial de Ventas', startX + 10, startY + 22);
        
        doc.fillColor('#2C2F30')
           .fontSize(9)
           .text(`Fecha: ${fechaExport}`, startX + pageWidth - 180, startY + 5);
        
        startY = 80;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Total Ventas: ${totalVentas}`, startX, startY);
        doc.text(`Total Ingresos: $${totalIngresos.toLocaleString('es-AR')}`, startX + 200, startY);
        
        startY += 25;
        
        const colWidths = [40, 70, 90, 180, 50, 70, 60, 60, 80];
        const headers = ['#', 'Fecha', 'Cliente', 'Productos', 'Cant.', 'Total', 'Método', 'Estado', 'Vendedor'];
        
        doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
        doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
        
        let currentX = startX;
        headers.forEach((h, i) => {
            doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
            currentX += colWidths[i];
        });
        
        startY += 18;
        doc.fillColor('#2C2F30').font('Helvetica');
        
        sales.forEach((s, index) => {
            if (startY > 530) {
                doc.addPage({ layout: 'landscape', margin: 25, size: 'A4' });
                startY = 40;
                
                doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
                doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
                currentX = startX;
                headers.forEach((h, i) => {
                    doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
                    currentX += colWidths[i];
                });
                startY += 18;
                doc.fillColor('#2C2F30').font('Helvetica');
            }
            
            const bgColor = s.total > 50000 ? '#FFF3CD' : (index % 2 === 0 ? '#FFFFFF' : '#FAFAFA');
            doc.rect(startX, startY - 3, pageWidth, 14).fill(bgColor);
            
            currentX = startX;
            doc.fontSize(7);
            
            doc.text(`#${s.id}`, currentX + 2, startY, { width: colWidths[0] - 4 });
            currentX += colWidths[0];
            
            doc.text(formatDate(s.fecha), currentX + 2, startY, { width: colWidths[1] - 4 });
            currentX += colWidths[1];
            
            doc.text(s.cliente || '-', currentX + 2, startY, { width: colWidths[2] - 4 });
            currentX += colWidths[2];
            
            doc.text((s.productos || '-').substring(0, 50), currentX + 2, startY, { width: colWidths[3] - 4 });
            currentX += colWidths[3];
            
            doc.text(String(s.cantidad_total || 0), currentX + 2, startY, { width: colWidths[4] - 4 });
            currentX += colWidths[4];
            
            doc.text(`$${s.total.toLocaleString('es-AR')}`, currentX + 2, startY, { width: colWidths[5] - 4 });
            currentX += colWidths[5];
            
            doc.text(s.metodo_pago || '-', currentX + 2, startY, { width: colWidths[6] - 4 });
            currentX += colWidths[6];
            
            doc.text(s.estado || 'Pagado', currentX + 2, startY, { width: colWidths[7] - 4 });
            currentX += colWidths[7];
            
            doc.text(s.vendedor || '-', currentX + 2, startY, { width: colWidths[8] - 4 });
            
            startY += 14;
        });
        
        startY += 10;
        doc.rect(startX, startY, pageWidth, 20).fill('#0049E6');
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(`controlZapas - Generado: ${fechaExport}`, startX + 10, startY + 6);
        doc.text(`Total: $${totalIngresos.toLocaleString('es-AR')} (${totalVentas} ventas)`, startX + pageWidth - 200, startY + 6);
        
        doc.end();
    } catch (e) {
        console.error('Error PDF:', e);
        res.status(500).json({ error: 'Error generando PDF' });
    }
});

router.get('/pdf', verificarToken, async (req, res) => {
    try {
        const sales = await getFilteredSales(req.user, req.query);
        const doc = new PDFDocument({ layout: 'landscape', margin: 25, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.pdf`);
        
        doc.pipe(res);
        
        const totalVentas = sales.length;
        const totalIngresos = sales.reduce((acc, s) => acc + s.total, 0);
        const fechaExport = new Date().toLocaleString('es-AR');
        
        const pageWidth = doc.page.width - 50;
        const startX = 25;
        let startY = 40;
        
        doc.rect(startX, 20, pageWidth, 40).fill('#0049E6');
        doc.fillColor('#FFFFFF')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('controlZapas', startX + 10, startY + 5);
        doc.fontSize(10)
           .font('Helvetica')
           .text('Historial de Ventas', startX + 10, startY + 22);
        
        doc.fillColor('#2C2F30')
           .fontSize(9)
           .text(`Fecha: ${fechaExport}`, startX + pageWidth - 180, startY + 5);
        
        startY = 80;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Total Ventas: ${totalVentas}`, startX, startY);
        doc.text(`Total Ingresos: $${totalIngresos.toLocaleString('es-AR')}`, startX + 200, startY);
        
        startY += 25;
        
        const colWidths = [40, 70, 90, 180, 50, 70, 60, 60, 80];
        const headers = ['#', 'Fecha', 'Cliente', 'Productos', 'Cant.', 'Total', 'Método', 'Estado', 'Vendedor'];
        
        doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
        doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
        
        let currentX = startX;
        headers.forEach((h, i) => {
            doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
            currentX += colWidths[i];
        });
        
        startY += 18;
        doc.fillColor('#2C2F30').font('Helvetica');
        
        sales.forEach((s, index) => {
            if (startY > 530) {
                doc.addPage({ layout: 'landscape', margin: 25, size: 'A4' });
                startY = 40;
                
                doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
                doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
                currentX = startX;
                headers.forEach((h, i) => {
                    doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
                    currentX += colWidths[i];
                });
                startY += 18;
                doc.fillColor('#2C2F30').font('Helvetica');
            }
            
            const bgColor = s.total > 50000 ? '#FFF3CD' : (index % 2 === 0 ? '#FFFFFF' : '#FAFAFA');
            doc.rect(startX, startY - 3, pageWidth, 14).fill(bgColor);
            
            currentX = startX;
            doc.fontSize(7);
            
            doc.text(`#${s.id}`, currentX + 2, startY, { width: colWidths[0] - 4 });
            currentX += colWidths[0];
            
            doc.text(formatDate(s.fecha), currentX + 2, startY, { width: colWidths[1] - 4 });
            currentX += colWidths[1];
            
            doc.text(s.cliente || '-', currentX + 2, startY, { width: colWidths[2] - 4 });
            currentX += colWidths[2];
            
            doc.text((s.productos || '-').substring(0, 50), currentX + 2, startY, { width: colWidths[3] - 4 });
            currentX += colWidths[3];
            
            doc.text(String(s.cantidad_total || 0), currentX + 2, startY, { width: colWidths[4] - 4 });
            currentX += colWidths[4];
            
            doc.text(`$${s.total.toLocaleString('es-AR')}`, currentX + 2, startY, { width: colWidths[5] - 4 });
            currentX += colWidths[5];
            
            doc.text(s.metodo_pago || '-', currentX + 2, startY, { width: colWidths[6] - 4 });
            currentX += colWidths[6];
            
            doc.text(s.estado || 'Pagado', currentX + 2, startY, { width: colWidths[7] - 4 });
            currentX += colWidths[7];
            
            doc.text(s.vendedor || '-', currentX + 2, startY, { width: colWidths[8] - 4 });
            
            startY += 14;
        });
        
        startY += 10;
        doc.rect(startX, startY, pageWidth, 20).fill('#0049E6');
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(`controlZapas - Generado: ${fechaExport}`, startX + 10, startY + 6);
        doc.text(`Total: $${totalIngresos.toLocaleString('es-AR')} (${totalVentas} ventas)`, startX + pageWidth - 200, startY + 6);
        
        doc.end();
    } catch (e) {
        console.error('Error PDF:', e);
        res.status(500).json({ error: 'Error generando PDF' });
    }
});

async function getFilteredInventario(user, filters) {
    const { search, talla } = filters;
    
    const variantes = await prisma.variante.findMany({
        include: {
            producto: true
        },
        orderBy: { producto: { nombre: 'asc' } }
    });
    
    let filtered = variantes.map(v => ({
        id: v.id,
        producto: v.producto?.nombre || '-',
        marca: v.producto?.marca || '-',
        color: v.color || '-',
        talla: v.talla,
        sku: v.sku || '-',
        precio_mayorista: v.producto?.precio_mayorista || 0,
        precio_minorista: v.producto?.precio_minorista || 0,
        stock_actual: v.stock_actual,
        stock_minimo: v.stock_minimo || 0
    }));
    
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(i => 
            i.producto.toLowerCase().includes(searchLower) ||
            i.marca.toLowerCase().includes(searchLower) ||
            i.sku.toLowerCase().includes(searchLower) ||
            i.color.toLowerCase().includes(searchLower) ||
            String(i.talla).includes(searchLower)
        );
    }
    
    if (talla) {
        const tallasArray = talla.split(',').map(t => parseFloat(t.trim())).filter(t => !isNaN(t));
        if (tallasArray.length > 0) {
            filtered = filtered.filter(i => tallasArray.includes(parseFloat(i.talla)));
        }
    }
    
    return filtered;
}

router.get('/inventario/csv', verificarToken, async (req, res) => {
    try {
        const inventario = await getFilteredInventario(req.user, req.query);
        
        let csv = 'Producto,Marca,Color,Talla,SKU,Precio Mayorista,Precio Minorista,Stock Actual,Stock Mínimo\n';
        inventario.forEach(i => {
            csv += `"${i.producto}","${i.marca}","${i.color}","${i.talla}","${i.sku}",${i.precio_mayorista},${i.precio_minorista},${i.stock_actual},${i.stock_minimo}\n`;
        });
        
        const totalUnidades = inventario.reduce((acc, i) => acc + i.stock_actual, 0);
        csv += `\n"","","","","","","TOTAL UNIDADES:",${totalUnidades},""\n`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Inventario_controlZapas_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csv);
    } catch (e) {
        console.error('Error CSV inventario:', e);
        res.status(500).json({ error: 'Error generando CSV' });
    }
});

router.get('/inventario/excel', verificarToken, async (req, res) => {
    try {
        const inventario = await getFilteredInventario(req.user, req.query);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');
        
        worksheet.columns = [
            { header: 'Producto', key: 'producto', width: 25 },
            { header: 'Marca', key: 'marca', width: 15 },
            { header: 'Color', key: 'color', width: 12 },
            { header: 'Talla', key: 'talla', width: 8 },
            { header: 'SKU', key: 'sku', width: 18 },
            { header: 'Precio Mayorista', key: 'precio_mayorista', width: 16 },
            { header: 'Precio Minorista', key: 'precio_minorista', width: 16 },
            { header: 'Stock', key: 'stock_actual', width: 10 },
            { header: 'Stock Mín', key: 'stock_minimo', width: 10 }
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FF0049E6' } };
        worksheet.getRow(1).alignment = { horizontal: 'center' };
        
        inventario.forEach((i, index) => {
            const row = worksheet.addRow({
                producto: i.producto,
                marca: i.marca,
                color: i.color,
                talla: i.talla,
                sku: i.sku,
                precio_mayorista: i.precio_mayorista,
                precio_minorista: i.precio_minorista,
                stock_actual: i.stock_actual,
                stock_minimo: i.stock_minimo
            });
            
            if (i.stock_actual <= 0) {
                row.fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
            } else if (i.stock_actual <= i.stock_minimo) {
                row.fill = { type: 'patternFill', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
            }
            
            row.getCell('precio_mayorista').numFmt = '"$"#,##0.00';
            row.getCell('precio_minorista').numFmt = '"$"#,##0.00';
            row.getCell('stock_actual').alignment = { horizontal: 'center' };
        });
        
        const totalRow = worksheet.addRow({
            producto: '',
            marca: '',
            color: '',
            talla: '',
            sku: '',
            precio_mayorista: '',
            precio_minorista: '',
            stock_actual: inventario.reduce((acc, i) => acc + i.stock_actual, 0),
            stock_minimo: ''
        });
        totalRow.font = { bold: true };
        totalRow.getCell('producto').value = `Total SKUs: ${inventario.length}`;
        
        worksheet.autoFilter = { from: 'A1', to: 'I1' };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Inventario_controlZapas_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Error Excel inventario:', e);
        res.status(500).json({ error: 'Error generando Excel' });
    }
});

router.get('/inventario/pdf', verificarToken, async (req, res) => {
    try {
        const inventario = await getFilteredInventario(req.user, req.query);
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Inventario_controlZapas_${new Date().toISOString().split('T')[0]}.pdf`);
        
        doc.pipe(res);
        
        const totalUnidades = inventario.reduce((acc, i) => acc + i.stock_actual, 0);
        const fechaExport = new Date().toLocaleString('es-AR');
        
        const pageWidth = doc.page.width - 50;
        const startX = 25;
        let startY = 40;
        
        doc.rect(startX, 20, pageWidth, 40).fill('#0049E6');
        doc.fillColor('#FFFFFF')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('controlZapas', startX + 10, startY + 5);
        doc.fontSize(10)
           .font('Helvetica')
           .text('Inventario de Stock', startX + 10, startY + 22);
        
        doc.fillColor('#2C2F30')
           .fontSize(9)
           .text(`Fecha: ${fechaExport}`, startX + pageWidth - 180, startY + 5);
        
        startY = 80;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`Total SKUs: ${inventario.length}`, startX, startY);
        doc.text(`Total Unidades: ${totalUnidades}`, startX + 200, startY);
        
        startY += 25;
        
        const colWidths = [70, 40, 30, 15, 55, 40, 40, 25, 25];
        const headers = ['Producto', 'Marca', 'Color', 'Talla', 'SKU', 'P. Mayor', 'P. Minor', 'Stock', 'Mín'];
        
        doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
        doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
        
        let currentX = startX;
        headers.forEach((h, i) => {
            doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
            currentX += colWidths[i];
        });
        
        startY += 18;
        doc.fillColor('#2C2F30').font('Helvetica');
        
        inventario.forEach((i, index) => {
            if (startY > 750) {
                doc.addPage({ margin: 25, size: 'A4' });
                startY = 40;
                
                doc.rect(startX, startY - 5, pageWidth, 18).fill('#F5F6F7');
                doc.fillColor('#595C5D').fontSize(8).font('Helvetica-Bold');
                currentX = startX;
                headers.forEach((h, i) => {
                    doc.text(h, currentX + 2, startY, { width: colWidths[i] - 4 });
                    currentX += colWidths[i];
                });
                startY += 18;
                doc.fillColor('#2C2F30').font('Helvetica');
            }
            
            let bgColor = '#FFFFFF';
            if (i.stock_actual <= 0) bgColor = '#FFEBEE';
            else if (i.stock_actual <= i.stock_minimo) bgColor = '#FFF8E1';
            
            doc.rect(startX, startY - 3, pageWidth, 14).fill(bgColor);
            
            currentX = startX;
            doc.fontSize(7);
            
            const producto = (i.producto || '-').substring(0, 20);
            doc.text(producto, currentX + 2, startY, { width: colWidths[0] - 4 });
            currentX += colWidths[0];
            
            doc.text(i.marca || '-', currentX + 2, startY, { width: colWidths[1] - 4 });
            currentX += colWidths[1];
            
            doc.text(i.color || '-', currentX + 2, startY, { width: colWidths[2] - 4 });
            currentX += colWidths[2];
            
            doc.text(String(i.talla || '-'), currentX + 2, startY, { width: colWidths[3] - 4 });
            currentX += colWidths[3];
            
            doc.text((i.sku || '-').substring(0, 15), currentX + 2, startY, { width: colWidths[4] - 4 });
            currentX += colWidths[4];
            
            doc.text(`$${i.precio_mayorista.toLocaleString('es-AR')}`, currentX + 2, startY, { width: colWidths[5] - 4 });
            currentX += colWidths[5];
            
            doc.text(`$${i.precio_minorista.toLocaleString('es-AR')}`, currentX + 2, startY, { width: colWidths[6] - 4 });
            currentX += colWidths[6];
            
            doc.text(String(i.stock_actual), currentX + 2, startY, { width: colWidths[7] - 4 });
            currentX += colWidths[7];
            
            doc.text(String(i.stock_minimo), currentX + 2, startY, { width: colWidths[8] - 4 });
            
            startY += 14;
        });
        
        startY += 10;
        doc.rect(startX, startY, pageWidth, 20).fill('#0049E6');
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(`controlZapas - Generado: ${fechaExport}`, startX + 10, startY + 6);
        doc.text(`Total: ${inventario.length} SKUs (${totalUnidades} unidades)`, startX + pageWidth - 220, startY + 6);
        
        doc.end();
    } catch (e) {
        console.error('Error PDF inventario:', e);
        res.status(500).json({ error: 'Error generando PDF' });
    }
});

module.exports = router;
