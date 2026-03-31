import { fetchAPI, API_URL } from './api.js';
import { getUser } from './auth.js';
import { formatCurrency, getImageUrl } from './utils.js';

let inventarioGlobal = [];
let variantesTemporales = [];
let imagenesTemporales = [];

export async function cargarStatsInventario() {
    try {
        const stats = await fetchAPI('/stats/inventario');
        
        document.getElementById('statTotalSku').textContent = stats.totalSku?.toLocaleString() || '0';
        document.getElementById('statValorInventario').textContent = formatCurrency(stats.valorInventario || 0);
        
        const stockBajoEl = document.getElementById('statStockBajo');
        const stockBajo = stats.stockBajo || 0;
        stockBajoEl.textContent = stockBajo;
        
        // Apply styling based on stock level
        const card = stockBajoEl.closest('.card');
        if (stockBajo === 0) {
            card.classList.remove('stock-alert');
            stockBajoEl.style.color = '';
        } else {
            card.classList.add('stock-alert');
        }
        
        document.getElementById('statRotacion').textContent = (stats.rotacion || 0) + 'x';
    } catch (e) {
        console.error('Error cargando stats inventario:', e);
        document.getElementById('statTotalSku').textContent = '-';
        document.getElementById('statValorInventario').textContent = '-';
        document.getElementById('statStockBajo').textContent = '-';
        document.getElementById('statRotacion').textContent = '-';
    }
}

export async function cargarInventario() {
    if (!window.location.pathname.endsWith('stock.html')) return;
    try {
        const data = await fetchAPI('/productos');
        inventarioGlobal = data;
        
        generarBotonesTalla();
        renderStock();
        renderMobileStock();
        cargarStatsInventario();

        if (getUser().rol === 'ADMIN') {
            document.getElementById('btnAdminNuevoProd').classList.remove('d-none');
        }

        // Toggle mobile/desktop layouts based on screen size
        handleLayoutToggle();
        window.addEventListener('resize', handleLayoutToggle);
    } catch (e) { console.error(e); }
}

export function generarBotonesTalla() {
    const container = document.getElementById('sizeFilters');
    if (!container || !inventarioGlobal.length) {
        if (container) container.innerHTML = '<span class="text-muted small">No hay productos</span>';
        return;
    }

    // Extract unique sizes and sort numerically
    const tallas = [...new Set(inventarioGlobal.map(item => parseFloat(item.talla)))]
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

    if (tallas.length === 0) {
        container.innerHTML = '<span class="text-muted small">Sin tallas disponibles</span>';
        return;
    }

    // Build HTML: "Todas" button + size buttons (Todas starts active by default)
    let html = `<button class="btn btn-size-filter flex-shrink-0 active" data-size="all" id="btnTodasTallas">Todas</button>`;
    tallas.forEach(talla => {
        html += `<button class="btn btn-size-filter flex-shrink-0" data-size="${talla}">${talla}</button>`;
    });

    container.innerHTML = html;

    // Re-attach click handlers for multi-select
    const sizeButtons = container.querySelectorAll('.btn-size-filter');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            
            if (size === 'all') {
                // "Todas" clears all other selections and shows all products
                sizeButtons.forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            } else {
                // Deselect "Todas" when selecting individual sizes
                const btnTodas = document.getElementById('btnTodasTallas');
                if (btnTodas) {
                    btnTodas.classList.remove('active');
                }
                
                // Toggle this button
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                } else {
                    btn.classList.add('active');
                }
            }
            
            actualizarBotonLimpiar();
            filtrarStock();
        });
    });
}

function actualizarBotonLimpiar() {
    const searchInput = document.getElementById('busquedaStock');
    const hasSearchText = searchInput && searchInput.value.trim().length > 0;
    
    const activeButtons = document.querySelectorAll('.btn-size-filter.active');
    const selectedSizes = Array.from(activeButtons).map(btn => btn.dataset.size);
    const tieneSoloTodas = selectedSizes.length === 1 && selectedSizes.includes('all');
    
    const clearBtn = document.getElementById('clearSizeFilters');
    if (clearBtn) {
        // Show if: has search text OR has filters other than "Todas"
        if (hasSearchText || !tieneSoloTodas) {
            clearBtn.classList.remove('d-none');
        } else {
            clearBtn.classList.add('d-none');
        }
    }
}

export function limpiarFiltrosTalla() {
    // Clear search input
    const searchInput = document.getElementById('busquedaStock');
    if (searchInput) searchInput.value = '';
    
    // Reset size filters to "Todas"
    const sizeButtons = document.querySelectorAll('.btn-size-filter');
    const btnTodas = document.getElementById('btnTodasTallas');
    
    sizeButtons.forEach(btn => btn.classList.remove('active'));
    if (btnTodas) btnTodas.classList.add('active');
    
    actualizarBotonLimpiar();
    filtrarStock();
}

function handleLayoutToggle() {
    const isMobile = window.innerWidth < 768;
    const desktopContainer = document.querySelector('.container.py-2:not(.d-md-none)');
    const mobileContainer = document.querySelector('.container.py-2.d-md-none');
    const fab = document.querySelector('.mobile-fab');
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    
    if (desktopContainer && mobileContainer) {
        if (isMobile) {
            desktopContainer.classList.add('d-none');
            mobileContainer.classList.remove('d-none');
            if (fab) fab.classList.remove('d-none');
            if (bottomNav) bottomNav.classList.remove('d-none');
        } else {
            desktopContainer.classList.remove('d-none');
            mobileContainer.classList.add('d-none');
            if (fab) fab.classList.add('d-none');
            if (bottomNav) bottomNav.classList.add('d-none');
        }
    }
}

function bgAlert(stock, min) {
    if (stock === 0) return 'bg-danger text-white';
    if (stock <= min) return 'bg-warning text-dark';
    return 'bg-success bg-opacity-10 text-success';
}

export function generarLinkWhatsapp(prod) {
    const userRole = getUser().rol;
    const precio = userRole === 'ADMIN' ? prod.precio_mayorista : prod.precio_minorista;
    const msg = `¡Hola! Te confirmo que tenemos disponibles las ${prod.nombre} en talla ${prod.talla}. El precio es de ${formatCurrency(precio)}. ¿Te las reservo?`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

export function renderStock(lista = inventarioGlobal) {
    const tbody = document.getElementById('tablaStockBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const user = getUser();
    const isAdmin = user && user.rol && user.rol.toUpperCase() === 'ADMIN';

    lista.forEach(item => {
        const pMostrar = isAdmin ?
            `<div class="fw-bold text-dark">${formatCurrency(item.precio_mayorista)}</div><div class="small text-muted">${formatCurrency(item.precio_minorista)} min</div>` :
            `<div class="fw-bold text-dark">${formatCurrency(item.precio_minorista)}</div>`;

        if (!item.sku) return;

        const isLowStock = item.stock_actual <= (item.stock_minimo || 2);
        const disableClass = item.stock_actual <= 0 ? 'opacity-50' : '';
        
        let stockBadge = '';
        if (item.stock_actual <= 0) {
            stockBadge = `<div class="d-flex flex-column align-items-center"><span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 fw-bold">Agotado</span></div>`;
        } else if (isLowStock) {
            stockBadge = `<div class="d-flex flex-column align-items-center gap-1">
                            <span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 fw-bold">${item.stock_actual} Unids.</span>
                            <span class="text-danger fw-bolder" style="font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase;">Stock Bajo</span>
                          </div>`;
        } else {
            stockBadge = `<div class="d-flex justify-content-center"><span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-1 fw-bold">${item.stock_actual} Unids.</span></div>`;
        }

        const itemJson = JSON.stringify(item).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        tbody.innerHTML += `
            <tr class="align-middle border-bottom border-light hover-bg-light transition-all ${disableClass}">
                <td class="py-3 ps-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="stock-thumb bg-white rounded-3 shadow-sm border p-1" style="width: 50px; height: 50px; flex-shrink: 0;" data-item="${itemJson}">
                            <div class="w-100 h-100 bg-light rounded-2 d-flex align-items-center justify-content-center text-muted">
                                <i class="bi bi-box-seam"></i>
                            </div>
                        </div>
                        <div>
                            <span class="fw-bold text-dark d-block mb-1" style="font-size: 0.95rem;">${item.nombre}</span>
                            <span class="text-muted fw-medium" style="font-size: 0.8rem;">${item.marca || 'Sin marca'}</span>
                        </div>
                    </div>
                </td>
                <td class="py-3">
                    <div class="d-flex align-items-center gap-1 flex-wrap">
                        <span class="badge bg-light text-dark border"><i class="bi bi-circle-fill text-secondary me-1" style="font-size:0.5rem"></i>${item.color || '-'}</span>
                        <span class="badge bg-secondary text-white rounded-pill">Talla ${item.talla}</span>
                    </div>
                </td>
                <td class="py-3 font-monospace text-muted small tracking-tight">
                    ${item.sku}
                </td>
                <td class="py-3">
                    ${pMostrar}
                </td>
                <td class="py-3 text-center">
                    ${stockBadge}
                </td>
                <td class="py-3 text-end pe-3">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-light text-dark border-0 px-2 rounded-pill" title="Ver Galería" onclick="verGaleriaStock(${item.producto_id}, '${item.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${isLowStock ? `<button class="btn btn-sm btn-light text-success border-0 px-2 rounded-pill" title="Solicitar Proveedor" onclick="event.stopPropagation(); window.open('https://wa.me/?text=Necesitamos%20reposición%20del%20SKU%20${item.sku}')"><i class="bi bi-whatsapp"></i></button>` : ''}
                        ${isAdmin ? `
                            <button class="btn btn-sm btn-light text-primary border-0 px-2 rounded-pill" title="Ajustar Stock" onclick="abrirModalAjustarStock(${item.variante_id}, ${item.stock_actual})">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-danger border-0 px-2 rounded-pill" title="Eliminar Variante" onclick="eliminarVariante(${item.variante_id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    cargarThumbsStock(lista);
}

export async function cargarThumbsStock(lista) {
    const pids = [...new Set(lista.map(i => i.producto_id))];
    for (let pid of pids) {
        try {
            const imgs = await fetchAPI('/productos/' + pid + '/imagenes');
            if (imgs && imgs.length > 0) {
                const principal = imgs[0];
                const thumbs = document.querySelectorAll('.stock-thumb');
                thumbs.forEach(thumb => {
                    try {
                        const cardItem = JSON.parse(thumb.dataset.item ? thumb.dataset.item.replace(/&quot;/g, '"') : '{}');
                        if (cardItem.producto_id === pid) {
                            thumb.innerHTML = '<img src="' + getImageUrl(principal.ruta, API_URL) + '" alt="thumb" class="rounded-2" style="width:100%;height:100%;object-fit:cover;">';
                        }
                    } catch (e) {
                         console.error(e);
                    }
                });
            }
        } catch (e) { console.error('Error cargando thumb:', e); }
    }
}

export function filtrarStock() {
    const text = document.getElementById('busquedaStock').value.toLowerCase();
    
    // Get all active size buttons (multi-select)
    const activeSizeButtons = document.querySelectorAll('.btn-size-filter.active');
    const selectedSizes = Array.from(activeSizeButtons).map(btn => btn.dataset.size);
    const tieneTodas = selectedSizes.includes('all');
    const selectedSizesNumbers = selectedSizes
        .map(s => parseFloat(s))
        .filter(s => !isNaN(s) && s !== 'all');
    
    const filtrado = inventarioGlobal.filter(i => {
        const matchText = (i.nombre && i.nombre.toLowerCase().includes(text)) ||
            (i.sku && i.sku.toLowerCase().includes(text)) ||
            (i.talla && i.talla.toString().includes(text));
        
        // If "Todas" is selected or no sizes selected, show all
        const matchSize = selectedSizes.length === 0 || tieneTodas || 
            selectedSizesNumbers.includes(parseFloat(i.talla));
        
        return matchText && matchSize;
    });
    renderStock(filtrado);
    renderMobileStock(filtrado);
    
    // Update clear button visibility
    actualizarBotonLimpiar();
}

// Render Mobile Card Layout
export function renderMobileStock(lista = inventarioGlobal) {
    const container = document.getElementById('mobileStockList');
    if (!container) return;
    container.innerHTML = '';

    const user = getUser();
    const isAdmin = user && user.rol && user.rol.toUpperCase() === 'ADMIN';

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">No se encontraron productos</p>
            </div>`;
        return;
    }

    lista.forEach(item => {
        const isLowStock = item.stock_actual <= (item.stock_minimo || 2);
        const stockBadge = item.stock_actual <= 0 
            ? `<span class="badge bg-danger">SIN STOCK</span>`
            : isLowStock 
                ? `<span class="badge bg-warning text-dark">BAJO (${item.stock_actual})</span>`
                : `<span class="badge bg-success">EN STOCK (${item.stock_actual})</span>`;

        container.innerHTML += `
            <article class="mobile-product-card">
                <div class="d-flex gap-3">
                    <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width: 80px; height: 80px; flex-shrink: 0;">
                        <i class="bi bi-box-seam text-muted" style="font-size: 2rem;"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="fw-bold mb-1" style="font-size: 1rem;">${item.nombre}</h5>
                            <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size: 0.6rem;">NEW</span>
                        </div>
                        <p class="text-muted mb-2" style="font-size: 0.75rem; font-family: monospace;">SKU: ${item.sku}</p>
                        <div class="d-flex gap-2 align-items-center mb-2">
                            <span class="badge bg-light text-dark">Talla ${item.talla}</span>
                            <span class="text-muted small">${item.color || '-'}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold color-primary">${formatCurrency(item.precio_minorista)}</span>
                            ${stockBadge}
                        </div>
                    </div>
                </div>
                <div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="verGaleriaStock(${item.producto_id}, '${item.nombre.replace(/'/g, "\\'")}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="abrirModalAjustarStock(${item.variante_id}, ${item.stock_actual})">
                            <i class="bi bi-pencil"></i>
                        </button>
                    ` : ''}
                </div>
            </article>
        `;
    });
}

// Expose to window
window.renderMobileStock = renderMobileStock;

export function agregarVarianteTemporal() {
    const s = document.getElementById('varSku').value;
    const c = document.getElementById('varColor').value;
    const t = document.getElementById('varTalla').value;
    const st = parseInt(document.getElementById('varStock').value);
    const m = parseInt(document.getElementById('varMin').value);

    if (!s || !t || isNaN(st)) return alert('Llena SKU, Talla y Stock');

    variantesTemporales.push({ sku: s, color: c, talla: t, stock_actual: st, stock_minimo: m || 0 });
    renderVariantesTemp();

    document.getElementById('varSku').value = '';
    document.getElementById('varTalla').value = '';
}

export function renderVariantesTemp() {
    const lb = document.getElementById('listaVariantesTemp');
    lb.innerHTML = '';
    variantesTemporales.forEach((v, idx) => {
        lb.innerHTML += `<tr>
            <td>${v.sku}</td><td>${v.color}</td><td>${v.talla}</td><td>${v.stock_actual}</td><td>${v.stock_minimo}</td>
            <td><button type="button" class="btn btn-sm btn-danger py-0" onclick="variantesTemporales.splice(${idx},1); renderVariantesTemp()"><i class="bi bi-x"></i></button></td>
        </tr>`;
    });
}

export function handleDrop(event) {
    event.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.style.borderColor = 'rgba(171,173,174,0.3)';
    dropZone.style.background = 'var(--bg-surface-container-low, #eff1f2)';

    const files = event.dataTransfer.files;
    if (files.length > 0) previsualizarImagenes(files);
}

export function previsualizarImagenes(files) {
    const container = document.getElementById('galeriaPreview');
    if (!container) return;

    Array.from(files).forEach((file, idx) => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            alert(`"${file.name}" excede el límite de 5MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagenesTemporales.push({ type: 'file', data: file, preview: e.target.result });
            renderGaleriaPreview();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('inputImagenes').value = '';
}

export function agregarImagenPorUrl() {
    const input = document.getElementById('inputUrlImagen');
    const url = input.value.trim();
    
    if (!url) {
        alert('Ingresa una URL de imagen');
        return;
    }

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExt = validExtensions.some(ext => url.toLowerCase().endsWith(ext));
    
    if (!hasValidExt) {
        alert('La URL debe ser una imagen válida (JPEG, PNG, WebP o GIF)');
        return;
    }

    imagenesTemporales.push({ type: 'url', data: url, preview: url });
    input.value = '';
    renderGaleriaPreview();
}

export function renderGaleriaPreview() {
    const container = document.getElementById('galeriaPreview');
    if (!container) return;
    container.innerHTML = '';

    imagenesTemporales.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'position-relative';
        thumb.style.cssText = 'width:100px; height:100px; border-radius:8px; overflow:hidden;';
        
        const isUrl = img.type === 'url';
        const sourceLabel = isUrl ? '<span class="position-absolute top-0 start-0 badge bg-info m-1" style="font-size:0.5rem;">URL</span>' : '';
        
        thumb.innerHTML = `
            <img src="${img.preview}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EError%3C/text%3E%3C/svg%3E'">
            ${sourceLabel}
            <button type="button" class="btn btn-sm position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                    style="width:22px; height:22px; background:rgba(180,19,64,0.85); border-radius:50%; border:none;"
                    onclick="quitarImagenTemporal(${idx})" title="Quitar">
                <i class="bi bi-x text-white" style="font-size:14px;"></i>
            </button>
            ${idx === 0 ? '<span class="position-absolute bottom-0 start-0 badge bg-primary m-1" style="font-size:0.6rem;">Principal</span>' : ''}
        `;
        container.appendChild(thumb);
    });
}

export function quitarImagenTemporal(index) {
    imagenesTemporales.splice(index, 1);
    renderGaleriaPreview();
}

export function limpiarGaleriaPreview() {
    const container = document.getElementById('galeriaPreview');
    if (container) container.innerHTML = '';
    imagenesTemporales = [];
}

export async function subirImagenesAlProducto(productoId) {
    const token = localStorage.getItem('cz_token');
    
    const files = imagenesTemporales.filter(img => img.type === 'file');
    const urls = imagenesTemporales.filter(img => img.type === 'url');
    
    try {
        if (files.length > 0) {
            const formData = new FormData();
            files.forEach(img => formData.append('imagenes', img.data));
            
            const response = await fetch(`${API_URL}/productos/${productoId}/imagenes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error subiendo imágenes');
            console.log(`${data.imagenes.length} imagen(es) subida(s) al producto ${productoId}`);
        }
        
        if (urls.length > 0) {
            for (const img of urls) {
                const response = await fetch(`${API_URL}/productos/${productoId}/imagenes-url`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url: img.data })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error subiendo imagen por URL');
            }
            console.log(`${urls.length} imagen(es) por URL subida(s) al producto ${productoId}`);
        }
    } catch (err) {
        console.error('Error subiendo imágenes:', err);
        alert('El producto se guardó, pero hubo un error subiendo las imágenes: ' + err.message);
    }
}

export function abrirModalAjustarStock(varId, stockActual) {
    document.getElementById('ajustarVarId').value = varId;
    document.getElementById('ajustarStockNum').value = stockActual;
    const modal = new bootstrap.Modal(document.getElementById('modalAjustarStock'));
    modal.show();
}

export async function confirmarAjustarStock() {
    const varId = document.getElementById('ajustarVarId').value;
    const nuevoStock = document.getElementById('ajustarStockNum').value;
    
    try {
        await fetchAPI(`/productos/variantes/${varId}/stock`, { 
            method: 'PUT', 
            body: JSON.stringify({ stock_actual: parseInt(nuevoStock) }) 
        });
        
        const modalEl = document.getElementById('modalAjustarStock');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        cargarInventario();
    } catch (e) { 
        alert('Error: ' + e.message); 
    }
}

export async function verGaleriaStock(prodId, nombre) {
    try {
        const imgs = await fetchAPI(`/productos/${prodId}/imagenes`);
        const inner = document.getElementById('carouselInnerStock');
        const titulo = document.getElementById('galeriaTitulo');
        
        titulo.textContent = nombre;
        inner.innerHTML = '';
        
        if (!imgs || imgs.length === 0) {
            inner.innerHTML = `
                <div class="carousel-item active">
                    <div class="d-flex align-items-center justify-content-center bg-dark" style="height: 400px;">
                        <div class="text-center">
                            <i class="bi bi-image text-white-50" style="font-size: 4rem;"></i>
                            <p class="mt-2 text-white-50">Sin imágenes disponibles</p>
                        </div>
                    </div>
                </div>`;
        } else {
            imgs.forEach((img, idx) => {
                inner.innerHTML += `
                    <div class="carousel-item ${idx === 0 ? 'active' : ''}">
                        <img src="${getImageUrl(img.ruta, API_URL)}" class="d-block w-100" style="height: 400px; object-fit: contain; background: #000;">
                    </div>`;
            });
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalGaleriaStock'));
        modal.show();
    } catch (e) {
        console.error(e);
    }
}

export async function eliminarVariante(id) {
    if (confirm('¿Estás seguro de eliminar esta variante (talla/color)? Esta acción no se puede deshacer.')) {
        try {
            await fetchAPI(`/productos/variantes/${id}`, { method: 'DELETE' });
            cargarInventario();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
}

const formNuevoP = document.getElementById('formNuevoProducto');

if (formNuevoP) {
    formNuevoP.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre: document.getElementById('prodNombre').value,
            marca: document.getElementById('prodMarca').value,
            precio_mayorista: parseFloat(document.getElementById('prodMayorista').value),
            precio_minorista: parseFloat(document.getElementById('prodMinorista').value),
            categoria: '',
            variantes: variantesTemporales
        };

        try {
            const producto = await fetchAPI('/productos', { method: 'POST', body: JSON.stringify(payload) });

            if (imagenesTemporales.length > 0 && producto && producto.id) {
                await subirImagenesAlProducto(producto.id);
            }

            alert('Producto Guardado!');
            const modalEl = document.getElementById('modalNuevoProd');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            formNuevoP.reset();
            variantesTemporales = [];
            imagenesTemporales = [];
            renderVariantesTemp();
            limpiarGaleriaPreview();
            cargarInventario();
        } catch (e) { alert('Error: ' + e.message); }
    });
}

window.renderStock = renderStock;
window.cargarInventario = cargarInventario;
window.cargarStatsInventario = cargarStatsInventario;
window.filtrarStock = filtrarStock;
window.generarBotonesTalla = generarBotonesTalla;
window.limpiarFiltrosTalla = limpiarFiltrosTalla;
window.agregarVarianteTemporal = agregarVarianteTemporal;
window.renderVariantesTemp = renderVariantesTemp;
window.handleDrop = handleDrop;
window.previsualizarImagenes = previsualizarImagenes;
window.agregarImagenPorUrl = agregarImagenPorUrl;
window.quitarImagenTemporal = quitarImagenTemporal;
window.renderGaleriaPreview = renderGaleriaPreview;
window.limpiarGaleriaPreview = limpiarGaleriaPreview;
window.subirImagenesAlProducto = subirImagenesAlProducto;
window.abrirModalAjustarStock = abrirModalAjustarStock;
window.confirmarAjustarStock = confirmarAjustarStock;
window.verGaleriaStock = verGaleriaStock;
window.eliminarVariante = eliminarVariante;
window.generarLinkWhatsapp = generarLinkWhatsapp;

// Exponer variables de estado para el onclick del HTML
window.inventarioGlobal = inventarioGlobal;
window.variantesTemporales = variantesTemporales;
window.imagenesTemporales = imagenesTemporales;
