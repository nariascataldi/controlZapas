import { formatCurrency, getImageUrl } from './utils.js';
import { getUser } from './auth.js';
import { fetchAPI, API_URL } from './api.js';

export function agruparProductos(lista) {
    const grupos = {};
    
    lista.forEach(item => {
        const key = `${item.nombre}|||${item.marca || 'Sin marca'}`;
        
        if (!grupos[key]) {
            grupos[key] = {
                nombre: item.nombre,
                marca: item.marca || 'Sin marca',
                producto_id: item.producto_id,
                precio_mayorista: item.precio_mayorista,
                precio_minorista: item.precio_minorista,
                imagenes: [],
                variantes: []
            };
        }
        
        grupos[key].variantes.push({
            variante_id: item.variante_id,
            sku: item.sku,
            color: item.color || '-',
            talla: item.talla,
            stock_actual: item.stock_actual,
            stock_minimo: item.stock_minimo || 2
        });
    });
    
    Object.values(grupos).forEach(grupo => {
        grupo.variantes.sort((a, b) => {
            const ta = parseFloat(a.talla);
            const tb = parseFloat(b.talla);
            if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
            return a.talla.localeCompare(b.talla);
        });
    });
    
    return Object.values(grupos);
}

export function crearCardProductoAgrupada(grupo, config = {}) {
    const {
        onVerGaleria = () => {},
        onAjustarStock = () => {},
        onAgregarCarrito = () => {},
        showStockAdmin = true,
        compact = false
    } = config;
    
    const user = getUser();
    const isAdmin = user && user.rol && user.rol.toUpperCase() === 'ADMIN';
    
    const precioMostrar = isAdmin && showStockAdmin 
        ? `<span class="fw-bold text-dark">${formatCurrency(grupo.precio_mayorista)}</span><span class="text-muted small ms-1">${formatCurrency(grupo.precio_minorista)} min</span>`
        : `<span class="fw-bold text-dark">${formatCurrency(grupo.precio_minorista)}</span>`;
    
    const tieneStock = grupo.variantes.some(v => v.stock_actual > 0);
    const variantesStock = grupo.variantes.filter(v => v.stock_actual > 0);
    const totalStock = variantesStock.reduce((sum, v) => sum + v.stock_actual, 0);
    
    const tallasDisponibles = variantesStock.map(v => v.talla).join(', ');
    
    const varianteJson = JSON.stringify(grupo).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    const primerVariante = grupo.variantes[0];
    const primerColor = primerVariante?.color || '-';
    
    return `
        <div class="product-card-group" data-producto-id="${grupo.producto_id}" data-variantes="${varianteJson}">
            <div class="card-header-group" onclick="toggleExpandCard(this)">
                <div class="d-flex align-items-center gap-3 flex-grow-1">
                    <div class="product-thumb bg-light rounded-3 d-flex align-items-center justify-content-center" 
                         style="width: ${compact ? '50px' : '60px'}; height: ${compact ? '50px' : '60px'}; flex-shrink: 0;"
                         data-pid="${grupo.producto_id}">
                        <i class="bi bi-box-seam text-muted"></i>
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="fw-bold color-dark text-truncate" style="font-size: ${compact ? '0.9rem' : '1rem'};">${grupo.nombre}</div>
                        <div class="text-muted small text-truncate">${grupo.marca}</div>
                        <div class="d-flex gap-2 mt-1 flex-wrap align-items-center">
                            <span class="badge bg-light text-dark" style="font-size: 0.7rem;">${primerColor}</span>
                            <span class="badge ${tieneStock ? 'bg-success' : 'bg-danger'}" style="font-size: 0.7rem;">${tieneStock ? totalStock + ' en stock' : 'Sin stock'}</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="text-end">
                        ${precioMostrar}
                    </div>
                    <div class="expand-icon">
                        <i class="bi bi-chevron-down"></i>
                    </div>
                </div>
            </div>
            <div class="card-body-group collapse">
                <div class="variantes-list">
                    <div class="variantes-header">
                        <span class="small fw-bold text-muted text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.05em;">Talles disponibles</span>
                        <span class="small text-muted">${variantesStock.length} variante${variantesStock.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="variantes-grid">
                        ${grupo.variantes.map(v => crearItemVariante(v, config)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function crearItemVariante(variante, config) {
    const { onAgregarCarrito, onAjustarStock, onVerGaleria, showStockAdmin = true } = config;
    const isAdmin = getUser()?.rol?.toUpperCase() === 'ADMIN';
    
    const isLowStock = variante.stock_actual <= (variante.stock_minimo || 2);
    const sinStock = variante.stock_actual <= 0;
    
    let stockBadge = '';
    if (sinStock) {
        stockBadge = `<span class="badge bg-danger bg-opacity-10 text-danger">Agotado</span>`;
    } else if (isLowStock) {
        stockBadge = `<span class="badge bg-warning text-dark">Stock bajo (${variante.stock_actual})</span>`;
    } else {
        stockBadge = `<span class="badge bg-success bg-opacity-10 text-success">${variante.stock_actual} unidades</span>`;
    }
    
    return `
        <div class="variante-item ${sinStock ? 'opacity-50' : ''}">
            <div class="variante-info">
                <span class="variante-talla">Talla ${variante.talla}</span>
                <span class="variante-color text-muted">${variante.color}</span>
                <span class="variante-sku text-muted small">${variante.sku}</span>
            </div>
            <div class="variante-stock">
                ${stockBadge}
            </div>
            <div class="variante-actions">
                ${!sinStock && onAgregarCarrito ? `
                    <button class="btn btn-sm btn-outline-primary rounded-pill" 
                            onclick="event.stopPropagation(); onAgregarVariante(${variante.variante_id})"
                            title="Agregar al carrito">
                        <i class="bi bi-cart-plus"></i>
                    </button>
                ` : ''}
                ${isAdmin && onVerGaleria ? `
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" 
                            onclick="event.stopPropagation(); onVerGaleria(${variante.producto_id}, '${variante.nombre.replace(/'/g, "\\'")}')"
                            title="Ver galería">
                        <i class="bi bi-eye"></i>
                    </button>
                ` : ''}
                ${isAdmin && onAjustarStock ? `
                    <button class="btn btn-sm btn-outline-primary rounded-pill" 
                            onclick="event.stopPropagation(); onAjustarStock(${variante.variante_id}, ${variante.stock_actual})"
                            title="Ajustar stock">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

export function crearCardProductoSimple(item, config = {}) {
    const {
        onVerGaleria = () => {},
        onAjustarStock = () => {},
        onAgregarCarrito = () => {}
    } = config;
    
    const user = getUser();
    const isAdmin = user && user.rol && user.rol.toUpperCase() === 'ADMIN';
    const disable = item.stock_actual <= 0;
    const precioRef = isAdmin ? item.precio_mayorista : item.precio_minorista;
    
    const itemJson = JSON.stringify(item).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    return `
        <div class="product-card-pos d-flex align-items-center gap-3 ${disable ? 'opacity-50' : ''}" 
             data-item="${itemJson}" ${disable ? '' : `onclick="agregarAlCarritoById(${item.variante_id})"`}>
            <div class="product-thumb" aria-hidden="true">
                <i class="bi bi-box-seam"></i>
            </div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold text-truncate color-dark" style="font-size:0.9rem;" title="${item.nombre}">${item.nombre}</div>
                <div class="d-flex gap-1 mt-1 flex-wrap">
                    <span class="badge" style="background:#eff1f2; color:#595c5d; font-weight:500;">${item.color || '-'}</span>
                    <span class="badge" style="background:#eff1f2; color:#595c5d; font-weight:500;">Talla ${item.talla}</span>
                    <span class="badge" style="background:rgba(0,73,230,0.08); color:#0049e6; font-weight:500;">${item.stock_actual} ud</span>
                </div>
            </div>
            <div class="text-end" style="min-width:80px;">
                <div class="fw-bold color-dark" style="font-size:0.95rem;">${formatCurrency(precioRef)}</div>
                ${disable ? '<div class="text-danger" style="font-size:0.65rem;">Sin Stock</div>' : '<div class="text-success" style="font-size:0.65rem;">Disponible</div>'}
            </div>
        </div>
    `;
}

export async function cargarThumbProducto(pid, containerSelector = '.product-thumb') {
    try {
        const imgs = await fetchAPI(`/productos/${pid}/imagenes`);
        if (imgs && imgs.length > 0) {
            const principal = imgs[0];
            const containers = document.querySelectorAll(`${containerSelector}[data-pid="${pid}"]`);
            containers.forEach(c => {
                c.innerHTML = `<img src="${getImageUrl(principal.ruta, API_URL)}" alt="thumb" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
            });
        }
    } catch (e) {
        console.error('Error cargando thumbnail:', e);
    }
}

export async function cargarThumbsMultiples(pids, containerSelector = '.product-thumb') {
    for (const pid of pids) {
        await cargarThumbProducto(pid, containerSelector);
    }
}

export function crearCardMobileAgrupada(grupo, config = {}) {
    const { onVerGaleria, onAjustarStock } = config;
    const isAdmin = getUser()?.rol?.toUpperCase() === 'ADMIN';
    
    const variantesStock = grupo.variantes.filter(v => v.stock_actual > 0);
    const totalStock = variantesStock.reduce((sum, v) => sum + v.stock_actual, 0);
    const tieneStock = totalStock > 0;
    
    return `
        <article class="mobile-product-card-group">
            <div class="card-header-group" onclick="this.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('show')">
                <div class="d-flex gap-3">
                    <div class="bg-light rounded-3 d-flex align-items-center justify-content-center stock-thumb" 
                         style="width: 80px; height: 80px; flex-shrink: 0;" data-pid="${grupo.producto_id}">
                        <i class="bi bi-box-seam text-muted" style="font-size: 2rem;"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="fw-bold mb-1" style="font-size: 1rem;">${grupo.nombre}</h5>
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size: 0.6rem;">${grupo.variantes.length} talles</span>
                        </div>
                        <p class="text-muted small mb-1">${grupo.marca}</p>
                        <div class="d-flex gap-2 align-items-center">
                            <span class="fw-bold color-primary">${formatCurrency(grupo.precio_minorista)}</span>
                            <span class="badge ${tieneStock ? 'bg-success' : 'bg-danger'}">${tieneStock ? totalStock + ' en stock' : 'Sin stock'}</span>
                        </div>
                    </div>
                </div>
                <div class="expand-icon text-muted mt-2 text-center">
                    <i class="bi bi-chevron-down"></i>
                </div>
            </div>
            <div class="card-body-group collapse">
                <div class="border-top pt-2 mt-2">
                    <div class="small fw-bold text-muted mb-2">Talles disponibles:</div>
                    <div class="d-flex flex-wrap gap-2">
                        ${grupo.variantes.map(v => `
                            <div class="d-flex align-items-center gap-2 p-2 rounded bg-light">
                                <span class="fw-bold">Talla ${v.talla}</span>
                                <span class="badge ${v.stock_actual > 0 ? 'bg-success' : 'bg-danger'}">${v.stock_actual > 0 ? v.stock_actual : 'Sin stock'}</span>
                                ${isAdmin && onAjustarStock ? `
                                    <button class="btn btn-sm btn-light p-1" onclick="onAjustarStock(${v.variante_id}, ${v.stock_actual})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${onVerGaleria ? `
                    <div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="onVerGaleria(${grupo.producto_id}, '${grupo.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-eye"></i> Ver galería
                        </button>
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

window.toggleExpandCard = function(headerEl) {
    const card = headerEl.closest('.product-card-group');
    const body = card.querySelector('.card-body-group');
    const icon = card.querySelector('.expand-icon i');
    
    body.classList.toggle('collapse');
    card.classList.toggle('expanded');
    icon.classList.toggle('bi-chevron-down');
    icon.classList.toggle('bi-chevron-up');
};

window.crearCardProductoAgrupada = crearCardProductoAgrupada;
window.crearCardMobileAgrupada = crearCardMobileAgrupada;
window.agruparProductos = agruparProductos;
window.cargarThumbProducto = cargarThumbProducto;
window.cargarThumbsMultiples = cargarThumbsMultiples;