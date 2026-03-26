const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken } = require('./auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

async function getFilteredSales(user, filters) {
    const { cliente, producto, sale_id, desde, hasta, metodo_pago, estado, vendedor_id, ids } = filters;
    
    let query = `
        SELECT DISTINCT v.id, v.fecha, v.total, v.comision_calculada, v.metodo_pago, v.estado, 
               c.nombre as cliente, u.nombre as vendedor,
               (SELECT GROUP_CONCAT(p.nombre, ', ') 
                FROM venta_detalles vd 
                JOIN variantes var ON vd.variante_id = var.id 
                JOIN productos p ON var.producto_id = p.id 
                WHERE vd.venta_id = v.id) as productos,
               (SELECT SUM(vd.cantidad) 
                FROM venta_detalles vd 
                WHERE vd.venta_id = v.id) as cantidad_total
        FROM ventas v
        JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.vendedor_id = u.id
        LEFT JOIN venta_detalles vd ON v.id = vd.venta_id
        LEFT JOIN variantes var ON vd.variante_id = var.id
        LEFT JOIN productos p ON var.producto_id = p.id
        WHERE 1=1
    `;
    let params = [];

    if (user.rol !== 'ADMIN') {
        query += ` AND v.vendedor_id = ?`;
        params.push(user.id);
    } else if (vendedor_id) {
        query += ` AND v.vendedor_id = ?`;
        params.push(vendedor_id);
    }

    if (ids) {
        const idArray = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (idArray.length > 0) {
            query += ` AND v.id IN (${idArray.map(() => '?').join(',')})`;
            params.push(...idArray);
        }
    }

    if (cliente) {
        query += ` AND c.nombre LIKE ?`;
        params.push(`%${cliente}%`);
    }

    if (producto) {
        query += ` AND p.nombre LIKE ?`;
        params.push(`%${producto}%`);
    }

    if (sale_id) {
        query += ` AND v.id = ?`;
        params.push(sale_id);
    }

    if (desde) {
        query += ` AND v.fecha >= ?`;
        params.push(desde);
    }

    if (hasta) {
        query += ` AND v.fecha <= ?`;
        params.push(hasta + ' 23:59:59');
    }

    if (metodo_pago) {
        query += ` AND v.metodo_pago = ?`;
        params.push(metodo_pago);
    }

    if (estado) {
        query += ` AND v.estado = ?`;
        params.push(estado);
    }

    query += ` ORDER BY v.fecha DESC`;

    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
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

module.exports = router;
