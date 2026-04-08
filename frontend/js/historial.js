import { API_URL } from './api.js';
import { getToken, getUser } from './auth.js';

let allData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let currentSort = { column: 'fecha', order: 'desc' };
let selectedIds = new Set();

export async function initHistorial() {
    window.historialModule = { cargarVentas, exportar, exportarSeleccionadas };

    const user = getUser();
    if (user.rol === 'ADMIN') {
        document.getElementById('filtroVendedorContainer').style.display = 'block';
        cargarVendedores();
    }

    document.getElementById('formFiltros').addEventListener('submit', (e) => {
        e.preventDefault();
        currentPage = 1;
        cargarVentas();
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('formFiltros').reset();
        currentPage = 1;
        cargarVentas();
    });

    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderTable();
    });

    document.getElementById('selectAll').addEventListener('change', (e) => {
        if (e.target.checked) {
            filteredData.forEach(d => selectedIds.add(d.id));
        } else {
            selectedIds.clear();
        }
        renderTable();
        updateExportSelectedBtn();
    });

    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            if (currentSort.column === column) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.order = 'desc';
            }
            updateSortIcons();
            fetchData();
        });
    });

    document.getElementById('formEditarVenta').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarEdicion();
    });

    document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
        const id = document.getElementById('btnConfirmarEliminar').dataset.ventaId;
        await eliminarVenta(id);
    });

    document.getElementById('btnDescargarPDF').addEventListener('click', async () => {
        const id = document.getElementById('btnDescargarPDF').dataset.ventaId;
        await imprimirVenta(id);
    });

    const inputs = ['filtroSearch', 'filtroProducto', 'filtroDesde', 'filtroHasta', 'filtroMetodo', 'filtroEstado', 'filtroVendedor'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
            currentPage = 1;
            fetchData();
        });
    });

    cargarVentas();

    window.exportarVentas = (tipo) => {
        exportar(tipo);
    };
    window.cargarVentasManual = () => {
        cargarVentas();
    };
    window.exportarSeleccionadasUI = () => {
        exportarSeleccionadas();
    };
}

async function cargarVendedores() {
    try {
        const res = await fetch(`${API_URL}/usuarios`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const vendedores = await res.json();
        const select = document.getElementById('filtroVendedor');
        vendedores.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando vendedores:', e);
    }
}

export async function cargarVentas() {
    currentPage = 1;
    fetchData();
}

async function fetchData() {
    const bodyEl = document.getElementById('historialBody');
    const emptyEl = document.getElementById('emptyState');
    const tableCard = document.querySelector('.card');

    bodyEl.innerHTML = `
        <tr>
            <td colspan="10" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted mb-0">Buscando ventas...</p>
            </td>
        </tr>
    `;
    emptyEl.style.display = 'none';
    tableCard.style.display = 'block';

    const search = document.getElementById('filtroSearch').value;
    const producto = document.getElementById('filtroProducto').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    const metodo = document.getElementById('filtroMetodo').value;
    const estado = document.getElementById('filtroEstado').value;
    const vendedor = document.getElementById('filtroVendedor').value;

    const sortColumnMap = {
        'v.id': 'id',
        'v.fecha': 'fecha',
        'c.nombre': 'cliente',
        'v.total': 'total',
        'u.nombre': 'vendedor'
    };
    const sortKey = sortColumnMap[currentSort.column] || 'fecha';

    const query = new URLSearchParams({
        cliente: isNaN(search) ? search : '',
        sale_id: !isNaN(search) && search !== '' ? search : '',
        producto,
        desde,
        hasta,
        metodo_pago: metodo,
        estado,
        vendedor_id: vendedor,
        limit: 1000,
        offset: 0,
        sort: sortKey,
        sortOrder: currentSort.order
    });

    try {
        const res = await fetch(`${API_URL}/ventas?${query}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        const result = await res.json();
        allData = result.data || [];
        
        filteredData = [...allData];
        
        updateSortIcons();
        renderTable();
        
    } catch (e) {
        bodyEl.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error al conectar con el servidor</td></tr>`;
    }
}

function renderTable() {
    const bodyEl = document.getElementById('historialBody');
    const emptyEl = document.getElementById('emptyState');
    const tableCard = document.querySelector('.card');
    const summaryEl = document.getElementById('historialSummary');

    if (filteredData.length === 0) {
        tableCard.style.display = 'none';
        emptyEl.style.display = 'block';
        summaryEl.textContent = 'No se encontraron ventas.';
        return;
    }

    tableCard.style.display = 'block';
    emptyEl.style.display = 'none';

    const totalIngresos = filteredData.reduce((acc, v) => acc + v.total, 0);
    summaryEl.textContent = `${filteredData.length} ventas | Total: $${totalIngresos.toLocaleString()}`;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    bodyEl.innerHTML = pageData.map(v => renderRow(v)).join('');

    renderPagination();
    updateExportSelectedBtn();
}

function renderRow(v) {
    const date = new Date(v.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isHighValue = v.total > 50000;
    const isSelected = selectedIds.has(v.id);
    
    const statusBadge = {
        'Pagado': '<span class="badge bg-success-subtle text-success">Pagado</span>',
        'Pendiente': '<span class="badge bg-warning-subtle text-warning">Pendiente</span>',
        'Cancelado': '<span class="badge bg-danger-subtle text-danger">Cancelado</span>'
    }[v.estado] || '<span class="badge bg-secondary">-</span>';

    const metodoIcon = {
        'Efectivo': '<i class="bi bi-cash text-success" aria-hidden="true"></i>',
        'Transferencia': '<i class="bi bi-bank text-primary" aria-hidden="true"></i>',
        'Tarjeta': '<i class="bi bi-credit-card text-info" aria-hidden="true"></i>'
    }[v.metodo_pago] || '<i class="bi bi-wallet2 text-muted" aria-hidden="true"></i>';

    return `
        <tr class="${isHighValue ? 'row-highlight' : ''} ${isSelected ? 'table-active' : ''}" data-id="${v.id}">
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-checkbox" data-id="${v.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="fw-semibold">#${v.id}</td>
            <td class="small text-muted">${date}</td>
            <td>
                <div class="fw-medium">${v.cliente || '-'}</div>
            </td>
            <td class="small" style="max-width:200px;">
                <div class="text-truncate" title="${v.productos || '-'}">${v.productos || '-'}</div>
            </td>
            <td class="text-end fw-bold ${isHighValue ? 'text-warning-emphasis' : 'color-primary'}">
                $${v.total.toLocaleString()}
            </td>
            <td>
                <span class="small">${metodoIcon} ${v.metodo_pago || '-'}</span>
            </td>
            <td>${statusBadge}</td>
            <td class="small">${v.vendedor || '-'}</td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="verDetalle(${v.id})" title="Ver detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="editarVenta(${v.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="duplicarVenta(${v.id})" title="Duplicar">
                        <i class="bi bi-copy"></i>
                    </button>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                            <li><a class="dropdown-item" href="#" onclick="imprimirVentaUI(${v.id}); return false;"><i class="bi bi-printer me-2"></i>Imprimir</a></li>
                            <li><a class="dropdown-item" href="#" onclick="exportarFila(${v.id}); return false;"><i class="bi bi-download me-2"></i>Exportar</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="confirmarEliminar(${v.id}); return false;"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                        </ul>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredData.length);

    document.getElementById('paginationInfo').innerHTML = `
        <span class="text-muted small">Mostrando ${startIndex}-${endIndex} de ${filteredData.length}</span>
    `;

    const navEl = document.getElementById('paginationNav');
    let html = '';

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">&laquo;</a>
    </li>`;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">&raquo;</a>
    </li>`;

    navEl.innerHTML = html;
}

window.goToPage = (page) => {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
    }
};

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (th.dataset.column === currentSort.column) {
            icon.className = `bi bi-chevron-${currentSort.order === 'asc' ? 'up' : 'down'} sort-icon`;
        } else {
            icon.className = 'bi bi-chevron-expand sort-icon';
        }
    });
}

function updateExportSelectedBtn() {
    const btn = document.getElementById('exportSelectedBtn');
    const count = selectedIds.size;
    btn.style.display = count > 0 ? 'block' : 'none';
    if (count > 0) {
        btn.querySelector('i').nextSibling.textContent = `Exportar ${count} Seleccionada${count > 1 ? 's' : ''}`;
    }
}

window.verDetalle = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleVenta'));
    document.getElementById('detVentaId').textContent = id;
    document.getElementById('detVentaBody').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
        </div>
    `;
    modal.show();

    try {
        const res = await fetch(`${API_URL}/ventas/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const venta = await res.json();

        const detallesHtml = venta.detalles && venta.detalles.length > 0
            ? venta.detalles.map(d => `
                <tr>
                    <td>${d.producto}</td>
                    <td class="text-muted">${d.sku || '-'}</td>
                    <td>${d.color || '-'}</td>
                    <td>Talla ${d.talla}</td>
                    <td class="text-center">${d.cantidad}</td>
                    <td class="text-end">$${d.precio_unitario.toLocaleString()}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" class="text-center text-muted">Sin detalles</td></tr>';

        document.getElementById('detVentaBody').innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <p class="meta-label mb-1">Cliente</p>
                    <p class="fw-medium mb-0">${venta.cliente || '-'}</p>
                    ${venta.contacto ? `<small class="text-muted">${venta.contacto}</small>` : ''}
                </div>
                <div class="col-md-6 text-md-end">
                    <p class="meta-label mb-1">Fecha</p>
                    <p class="fw-medium mb-0">${new Date(venta.fecha).toLocaleString('es-AR')}</p>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-4">
                    <p class="meta-label mb-1">Método Pago</p>
                    <p class="fw-medium mb-0">${venta.metodo_pago || '-'}</p>
                </div>
                <div class="col-4">
                    <p class="meta-label mb-1">Estado</p>
                    <p class="fw-medium mb-0">${venta.estado || 'Pagado'}</p>
                </div>
                <div class="col-4 text-end">
                    <p class="meta-label mb-1">Total</p>
                    <p class="fw-bold color-primary mb-0 fs-5">$${venta.total.toLocaleString()}</p>
                </div>
            </div>
            
            <p class="meta-label mb-2">Productos</p>
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Color</th>
                            <th>Talla</th>
                            <th class="text-center">Cant.</th>
                            <th class="text-end">Precio</th>
                        </tr>
                    </thead>
                    <tbody>${detallesHtml}</tbody>
                </table>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-4 pt-3" style="border-top:1px solid rgba(0,0,0,0.05);">
                <div>
                    <p class="meta-label mb-1">Vendedor</p>
                    <p class="fw-medium mb-0">${venta.vendedor || '-'}</p>
                </div>
                <div class="text-end">
                    <p class="meta-label mb-1">Comisión</p>
                    <p class="fw-medium mb-0">$${venta.comision_calculada ? venta.comision_calculada.toLocaleString() : '0'}</p>
                </div>
            </div>
        `;
    } catch (e) {
        document.getElementById('detVentaBody').innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle display-6"></i>
                <p class="mt-3">Error al cargar los detalles</p>
            </div>
        `;
    }
};

window.editarVenta = async (id) => {
    const venta = filteredData.find(v => v.id === id);
    if (!venta) return;

    document.getElementById('editVentaId').textContent = id;
    document.getElementById('editEstado').value = venta.estado || 'Pagado';
    document.getElementById('editMetodoPago').value = venta.metodo_pago || 'Efectivo';

    const modal = new bootstrap.Modal(document.getElementById('modalEditarVenta'));
    modal.show();
};

async function guardarEdicion() {
    const id = document.getElementById('editVentaId').textContent;
    const estado = document.getElementById('editEstado').value;
    const metodo_pago = document.getElementById('editMetodoPago').value;

    try {
        const res = await fetch(`${API_URL}/ventas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ estado, metodo_pago })
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalEditarVenta')).hide();
            showToast('Venta actualizada correctamente');
            fetchData();
        } else {
            const err = await res.json();
            showToast(err.error || 'Error al actualizar', 'danger');
        }
    } catch (e) {
        showToast('Error de conexión', 'danger');
    }
}

window.duplicarVenta = async (id) => {
    try {
        const res = await fetch(`${API_URL}/ventas/${id}/duplicar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (res.ok) {
            const data = await res.json();
            showToast(`Venta duplicada (Nueva: #${data.nueva_venta_id})`);
            fetchData();
        } else {
            const err = await res.json();
            showToast(err.error || 'Error al duplicar', 'danger');
        }
    } catch (e) {
        showToast('Error de conexión', 'danger');
    }
};

window.confirmarEliminar = (id) => {
    document.getElementById('btnConfirmarEliminar').dataset.ventaId = id;
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
    modal.show();
};

async function eliminarVenta(id) {
    try {
        const res = await fetch(`${API_URL}/ventas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar')).hide();

        if (res.ok) {
            showToast('Venta eliminada correctamente');
            selectedIds.delete(id);
            fetchData();
        } else {
            const err = await res.json();
            showToast(err.error || 'Error al eliminar', 'danger');
        }
    } catch (e) {
        showToast('Error de conexión', 'danger');
    }
}

window.imprimirVentaUI = (id) => {
    document.getElementById('btnDescargarPDF').dataset.ventaId = id;
    const modal = new bootstrap.Modal(document.getElementById('modalImprimir'));
    modal.show();
};

async function imprimirVenta(id) {
    bootstrap.Modal.getInstance(document.getElementById('modalImprimir')).hide();
    
    const venta = filteredData.find(v => v.id === id);
    if (!venta) return;

    const query = new URLSearchParams({ ids: id });
    await descargarArchivo(`${API_URL}/export/pdf?${query}`, 'HistorialVenta_' + id + '.pdf');
}

window.exportarFila = async (id) => {
    const query = new URLSearchParams({ ids: id });
    await descargarArchivo(`${API_URL}/export/pdf?${query}`, 'HistorialVenta_' + id + '.pdf');
};

async function descargarArchivo(url, filename) {
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (!res.ok) {
            const err = await res.json();
            showToast(err.error || 'Error al exportar', 'danger');
            return;
        }
        
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        showToast('Descarga iniciada');
    } catch (e) {
        showToast('Error de conexión', 'danger');
    }
}

export function exportar(tipo) {
    const search = document.getElementById('filtroSearch').value;
    const producto = document.getElementById('filtroProducto').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    const metodo = document.getElementById('filtroMetodo').value;
    const estado = document.getElementById('filtroEstado').value;
    const vendedor = document.getElementById('filtroVendedor').value;

    const extensions = { excel: 'xlsx', csv: 'csv', pdf: 'pdf' };
    const ext = extensions[tipo] || tipo;
    const filename = `HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.${ext}`;

    const query = new URLSearchParams({
        cliente: isNaN(search) ? search : '',
        sale_id: !isNaN(search) && search !== '' ? search : '',
        producto,
        desde,
        hasta,
        metodo_pago: metodo,
        estado,
        vendedor_id: vendedor
    });

    descargarArchivo(`${API_URL}/export/${tipo}?${query}`, filename);
}

export function exportarSeleccionadas() {
    if (selectedIds.size === 0) {
        showToast('Selecciona al menos una venta', 'warning');
        return;
    }

    const ids = Array.from(selectedIds).join(',');
    const filename = `HistorialVentas_controlZapas_${new Date().toISOString().split('T')[0]}.xlsx`;

    const search = document.getElementById('filtroSearch').value;
    const producto = document.getElementById('filtroProducto').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    const metodo = document.getElementById('filtroMetodo').value;
    const estado = document.getElementById('filtroEstado').value;
    const vendedor = document.getElementById('filtroVendedor').value;

    const query = new URLSearchParams({
        ids,
        cliente: isNaN(search) ? search : '',
        producto,
        desde,
        hasta,
        metodo_pago: metodo,
        estado,
        vendedor_id: vendedor
    });

    descargarArchivo(`${API_URL}/export/excel?${query}`, filename);
    showToast(`Exportando ${selectedIds.size} venta(s) seleccionada(s)`);
}

function showToast(message, type = 'primary') {
    const toastEl = document.getElementById('toastMessage');
    const toastBody = document.getElementById('toastBody');
    
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastBody.textContent = message;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
        updateExportSelectedBtn();
        
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) row.classList.toggle('table-active', e.target.checked);
        
        const allSelected = filteredData.every(d => selectedIds.has(d.id));
        document.getElementById('selectAll').checked = filteredData.length > 0 && allSelected;
        document.getElementById('selectAll').indeterminate = !allSelected && selectedIds.size > 0;
    });
});
