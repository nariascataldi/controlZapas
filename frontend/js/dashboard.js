import { fetchAPI } from './api.js';
import { formatCurrency } from './utils.js';

export async function cargarDashboard() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    try {
        const kpis = await fetchAPI('/stats/kpis');
        const elTotalVentas = document.getElementById('widgetTotalVentas');
        const elGanancias = document.getElementById('widgetGanancias');
        const elComisiones = document.getElementById('widgetComisiones');

        if (elTotalVentas) elTotalVentas.textContent = formatCurrency(kpis.ventas_totales_mes);
        if (elGanancias) elGanancias.textContent = formatCurrency(kpis.ganancias_netas_mes);
        if (elComisiones) elComisiones.textContent = formatCurrency(kpis.comisiones_por_pagar);
    } catch (error) {
        console.error('Error cargando KPIs:', error);
    }
}

export async function cargarHistorialAdmin() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    Promise.all([
        cargarHistorialVendedores(),
        cargarHistorialClientes(),
        cargarTopProductos()
    ]).catch(e => console.error("Error en historiales:", e));
}

export async function cargarHistorialVendedores() {
    const tbody = document.getElementById('historialVendedoresBody');
    if (!tbody) return;

    const vendedores = await fetchAPI('/stats/rendimiento-vendedores');
    tbody.innerHTML = '';

    if (vendedores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aún no hay ventas registradas por vendedores.</td></tr>';
        return;
    }

    vendedores.forEach(v => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom border-light align-middle';
        tr.innerHTML = `
            <td class="py-3">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle bg-secondary bg-opacity-10 text-secondary me-3 d-flex justify-content-center align-items-center" style="width:36px; height:36px">
                        <i class="bi bi-person-badge fs-6"></i>
                    </div>
                    <span class="fw-semibold color-dark">${v.nombre}</span>
                </div>
            </td>
            <td class="py-3"><span class="badge border border-secondary text-secondary bg-transparent">${v.porcentaje_comision}%</span></td>
            <td class="py-3 text-muted">${v.cantidad_ventas}</td>
            <td class="py-3 fw-bold color-dark">${formatCurrency(v.total_vendido)}</td>
            <td class="py-3 text-danger fw-semibold">${formatCurrency(v.total_comisiones)}</td>
        `;
        tbody.appendChild(tr);
    });
}

export async function cargarHistorialClientes() {
    const tbody = document.getElementById('historialClientesBody');
    if (!tbody) return;

    const clientes = await fetchAPI('/stats/historial-clientes');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aún no hay clientes registrados.</td></tr>';
        return;
    }

    clientes.slice(0, 4).forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom border-light align-middle';
        const dateStr = c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString() : '-';
        tr.innerHTML = `
            <td class="py-3">
                <span class="fw-semibold color-dark d-block">${c.nombre}</span>
                <small class="text-muted" style="font-size:0.75rem">${c.contacto || 'Sin contacto'}</small>
            </td>
            <td class="py-3 text-muted">${c.cantidad_compras}</td>
            <td class="py-3 color-primary fw-semibold">${formatCurrency(c.total_gastado)}</td>
            <td class="py-3 text-muted small">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

export async function cargarTopProductos() {
    const tbody = document.getElementById('topProductosBody');
    if (!tbody) return;

    const top = await fetchAPI('/stats/top-productos');
    tbody.innerHTML = '';

    if (top.length === 0) {
        tbody.innerHTML = '<div class="text-center text-muted p-3">Aún no hay productos vendidos.</div>';
        return;
    }

    top.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center border-bottom border-light py-2';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="badge rounded-circle bg-dark me-3" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center;">${idx + 1}</div>
                <div>
                    <span class="fw-medium color-dark d-block" style="font-size:0.9rem">${p.nombre}</span>
                    <small class="text-muted" style="font-size:0.75rem">${p.marca}</small>
                </div>
            </div>
            <div class="text-end">
                <span class="fw-bold color-dark d-block" style="font-size:0.9rem">${p.unidades_vendidas} unds</span>
                <small class="text-success" style="font-size:0.75rem">+${formatCurrency(p.ingresos_generados)}</small>
            </div>
        `;
        tbody.appendChild(item);
    })
}
