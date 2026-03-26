const API_URL = 'http://localhost:3000/api';

// --- UTILIDADES GLOBALES ---

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(amount);
}

function getToken() {
    return localStorage.getItem('cz_token');
}

function getUser() {
    try {
        const u = localStorage.getItem('cz_user');
        return u ? JSON.parse(u) : {};
    } catch (e) { return {}; }
}

async function fetchAPI(endpoint, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        if (response.status === 401 || response.status === 403) {
            alert('Sesión expirada o acceso denegado.');
            logout();
            return null;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en la petición');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem('cz_token');
    localStorage.removeItem('cz_user');
    window.location.href = 'login.html';
}

function verificarAcceso(rolRequerido = null) {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    if (rolRequerido && user.rol !== rolRequerido) {
        window.location.href = 'index.html'; // Redirige a la pantalla correcta
    }
}

function configurarNavBar() {
    const user = getUser();
    const navLinks = document.getElementById('navLinks');
    const navBrand = document.getElementById('navBrand');

    if (!navLinks) return;

    navLinks.innerHTML = `
        ${user.rol === 'ADMIN' ? `<li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>` : ''}
        <li class="nav-item"><a class="nav-link" href="stock.html">Inventario</a></li>
        <li class="nav-item"><a class="nav-link" href="ventas.html">Punto de Venta</a></li>
        ${user.rol === 'ADMIN' ? `<li class="nav-item"><a class="nav-link" href="vendedores.html">Vendedores</a></li>` : ''}
        <li class="nav-item ms-lg-3 d-flex align-items-center">
            <span class="text-white-50 small me-3"><i class="bi bi-person-circle"></i> ${user.nombre}</span>
            <button class="btn btn-outline-light btn-sm" onclick="logout()">Salir</button>
        </li>
    `;

    if (navBrand && user.rol === 'ADMIN') {
        navBrand.innerHTML += ` <span class="badge bg-secondary ms-2 small">Admin</span>`;
    }
}

// --- LOGICA POR PANTALLA ---

// 1. LOGIN
if (window.location.pathname.endsWith('login.html')) {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('inputUser').value;
            const p = document.getElementById('inputPassword').value;
            const alertBox = document.getElementById('loginAlert');

            try {
                const data = await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ nombre: u, password: p })
                });

                if (data && data.token) {
                    localStorage.setItem('cz_token', data.token);
                    localStorage.setItem('cz_user', JSON.stringify(data.usuario));
                    window.location.href = 'index.html';
                }
            } catch (error) {
                alertBox.textContent = error.message;
                alertBox.classList.remove('d-none');
            }
        });
    }
}

// 3. INVENTARIO / STOCK

// 3. INVENTARIO / STOCK
let inventarioGlobal = [];
let variantesTemporales = [];

async function cargarInventario() {
    if (!window.location.pathname.endsWith('stock.html')) return;
    try {
        const data = await fetchAPI('/productos');
        inventarioGlobal = data;
        renderStock();

        // Habilitar botón de nuevo producto si es ADMIN
        if (getUser().rol === 'ADMIN') {
            document.getElementById('btnAdminNuevoProd').classList.remove('d-none');
        }
    } catch (e) { console.error(e); }
}

function bgAlert(stock, min) {
    if (stock === 0) return 'bg-danger text-white';
    if (stock <= min) return 'bg-warning text-dark';
    return 'bg-success bg-opacity-10 text-success';
}

function generarLinkWhatsapp(prod) {
    const userRole = getUser().rol;
    const precio = userRole === 'ADMIN' ? prod.precio_mayorista : prod.precio_minorista;
    const msg = `¡Hola! Te confirmo que tenemos disponibles las ${prod.nombre} en talla ${prod.talla}. El precio es de ${formatCurrency(precio)}. ¿Te las reservo?`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

function renderStock(lista = inventarioGlobal) {
    const tbody = document.getElementById('tablaStockBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const user = getUser();
    const isAdmin = user && user.rol && user.rol.toUpperCase() === 'ADMIN';

    lista.forEach(item => {
        const pMostrar = isAdmin ?
            `<div class="fw-bold text-dark">${formatCurrency(item.precio_mayorista)}</div><div class="small text-muted">${formatCurrency(item.precio_minorista)} min</div>` :
            `<div class="fw-bold text-dark">${formatCurrency(item.precio_minorista)}</div>`;

        // Si no hay variante (producto sin hijos aún), omitimos pintar filas de data o la pintamos vacía
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

async function cargarThumbsStock(lista) {
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
                            thumb.innerHTML = '<img src="' + API_URL.replace('/api', '') + principal.ruta + '" alt="thumb" class="rounded-2" style="width:100%;height:100%;object-fit:cover;">';
                        }
                    } catch (e) {
                         console.error(e);
                    }
                });
            }
        } catch (e) { console.error('Error cargando thumb:', e); }
    }
}

function filtrarStock() {
    const text = document.getElementById('busquedaStock').value.toLowerCase();
    const filtrado = inventarioGlobal.filter(i =>
        (i.nombre && i.nombre.toLowerCase().includes(text)) ||
        (i.sku && i.sku.toLowerCase().includes(text)) ||
        (i.talla && i.talla.toString().includes(text))
    );
    renderStock(filtrado);
}

// (Nuevo Producto - Lógica UI)
function agregarVarianteTemporal() {
    const s = document.getElementById('varSku').value;
    const c = document.getElementById('varColor').value;
    const t = document.getElementById('varTalla').value;
    const st = parseInt(document.getElementById('varStock').value);
    const m = parseInt(document.getElementById('varMin').value);

    if (!s || !t || isNaN(st)) return alert('Llena SKU, Talla y Stock');

    variantesTemporales.push({ sku: s, color: c, talla: t, stock_actual: st, stock_minimo: m || 0 });
    renderVariantesTemp();

    // reset mini form
    document.getElementById('varSku').value = '';
    document.getElementById('varTalla').value = '';
}

function renderVariantesTemp() {
    const lb = document.getElementById('listaVariantesTemp');
    lb.innerHTML = '';
    variantesTemporales.forEach((v, idx) => {
        lb.innerHTML += `<tr>
            <td>${v.sku}</td><td>${v.color}</td><td>${v.talla}</td><td>${v.stock_actual}</td><td>${v.stock_minimo}</td>
            <td><button type="button" class="btn btn-sm btn-danger py-0" onclick="variantesTemporales.splice(${idx},1); renderVariantesTemp()"><i class="bi bi-x"></i></button></td>
        </tr>`;
    });
}

const formNuevoP = document.getElementById('formNuevoProducto');
let imagenesTemporales = []; // Files pendientes de subir

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

            // Si hay imágenes pendientes, subirlas al producto recién creado
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

// --- GALERÍA DE IMÁGENES ---

function handleDrop(event) {
    event.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.style.borderColor = 'rgba(171,173,174,0.3)';
    dropZone.style.background = 'var(--bg-surface-container-low, #eff1f2)';

    const files = event.dataTransfer.files;
    if (files.length > 0) previsualizarImagenes(files);
}

function previsualizarImagenes(files) {
    const container = document.getElementById('galeriaPreview');
    if (!container) return;

    Array.from(files).forEach((file, idx) => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            alert(`"${file.name}" excede el límite de 5MB.`);
            return;
        }

        imagenesTemporales.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const index = imagenesTemporales.length - 1;
            const thumb = document.createElement('div');
            thumb.className = 'position-relative';
            thumb.style.cssText = 'width:100px; height:100px; border-radius:8px; overflow:hidden; transition:transform 0.2s;';
            thumb.id = `thumb-${index}`;
            thumb.innerHTML = `
                <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                <button type="button" class="btn btn-sm position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                        style="width:22px; height:22px; background:rgba(180,19,64,0.85); border-radius:50%; border:none;"
                        onclick="quitarImagenTemporal(${index})"
                        title="Quitar">
                    <i class="bi bi-x text-white" style="font-size:14px;"></i>
                </button>
                ${index === 0 ? '<span class="position-absolute bottom-0 start-0 badge bg-primary m-1" style="font-size:0.6rem;">Principal</span>' : ''}
            `;
            container.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });

    // Limpiar el input
    document.getElementById('inputImagenes').value = '';
}

function quitarImagenTemporal(index) {
    imagenesTemporales.splice(index, 1);
    renderGaleriaPreviewLocal();
}

function renderGaleriaPreviewLocal() {
    const container = document.getElementById('galeriaPreview');
    if (!container) return;
    container.innerHTML = '';

    imagenesTemporales.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.createElement('div');
            thumb.className = 'position-relative';
            thumb.style.cssText = 'width:100px; height:100px; border-radius:8px; overflow:hidden;';
            thumb.innerHTML = `
                <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                <button type="button" class="btn btn-sm position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                        style="width:22px; height:22px; background:rgba(180,19,64,0.85); border-radius:50%; border:none;"
                        onclick="quitarImagenTemporal(${idx})" title="Quitar">
                    <i class="bi bi-x text-white" style="font-size:14px;"></i>
                </button>
                ${idx === 0 ? '<span class="position-absolute bottom-0 start-0 badge bg-primary m-1" style="font-size:0.6rem;">Principal</span>' : ''}
            `;
            container.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
}

function limpiarGaleriaPreview() {
    const container = document.getElementById('galeriaPreview');
    if (container) container.innerHTML = '';
    imagenesTemporales = [];
}

async function subirImagenesAlProducto(productoId) {
    const formData = new FormData();
    imagenesTemporales.forEach(file => formData.append('imagenes', file));

    const token = getToken();
    try {
        const response = await fetch(`${API_URL}/productos/${productoId}/imagenes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error subiendo imágenes');
        console.log(`${data.imagenes.length} imagen(es) subida(s) al producto ${productoId}`);
    } catch (err) {
        console.error('Error subiendo imágenes:', err);
        alert('El producto se guardó, pero hubo un error subiendo las imágenes: ' + err.message);
    }
}

function abrirModalAjustarStock(varId, stockActual) {
    document.getElementById('ajustarVarId').value = varId;
    document.getElementById('ajustarStockNum').value = stockActual;
    const modal = new bootstrap.Modal(document.getElementById('modalAjustarStock'));
    modal.show();
}

async function confirmarAjustarStock() {
    const varId = document.getElementById('ajustarVarId').value;
    const nuevoStock = document.getElementById('ajustarStockNum').value;
    
    try {
        await fetchAPI(`/productos/variantes/${varId}/stock`, { 
            method: 'PUT', 
            body: JSON.stringify({ stock_actual: parseInt(nuevoStock) }) 
        });
        
        // Cerrar modal
        const modalEl = document.getElementById('modalAjustarStock');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        cargarInventario(); // Recargar tabla
    } catch (e) { 
        alert('Error: ' + e.message); 
    }
}

async function verGaleriaStock(prodId, nombre) {
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
                        <img src="${API_URL.replace('/api', '')}${img.ruta}" class="d-block w-100" style="height: 400px; object-fit: contain; background: #000;">
                    </div>`;
            });
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalGaleriaStock'));
        modal.show();
    } catch (e) {
        console.error(e);
    }
}

async function eliminarVariante(id) {
    if (confirm('¿Estás seguro de eliminar esta variante (talla/color)? Esta acción no se puede deshacer.')) {
        try {
            await fetchAPI(`/productos/variantes/${id}`, { method: 'DELETE' });
            cargarInventario();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }
}


// 4. POS (PUNTO DE VENTA)
let carritoPos = [];
let buscarPosResults = [];

async function buscarPos(fueEnter = false) {
    if (!window.location.pathname.endsWith('ventas.html')) return;
    const inputEl = document.getElementById('posBuscador');
    const query = inputEl.value.trim();
    const container = document.getElementById('posResultados');

    try {
        const res = await fetchAPI(`/productos/buscar?q=${encodeURIComponent(query)}`);
        buscarPosResults = res;

        container.innerHTML = '';
        if (res.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><p>No se encontraron productos.</p></div>';
            return;
        }

        const userRole = getUser().rol;

        // Auto-agregar si fue enter (escáner de barras típico) y hubo una coincidencia exacta de SKU
        if (fueEnter && query.length > 0) {
            const exactaSKU = res.find(item => item.sku && item.sku.toLowerCase() === query.toLowerCase());
            if (exactaSKU && exactaSKU.stock_actual > 0) {
                agregarAlCarrito(exactaSKU);
                inputEl.value = '';
                // Flash verde en el scanner
                const scannerEl = document.querySelector('.scanner-input');
                if (scannerEl) { scannerEl.classList.add('scanner-flash'); setTimeout(() => scannerEl.classList.remove('scanner-flash'), 500); }
                return buscarPos(false);
            } else if (res.length === 1 && res[0].stock_actual > 0) {
                agregarAlCarrito(res[0]);
                inputEl.value = '';
                return buscarPos(false);
            }
        }

        // Update result count
        const countEl = document.getElementById('posResultCount');
        if (countEl) countEl.textContent = `${res.length} producto${res.length !== 1 ? 's' : ''} encontrado${res.length !== 1 ? 's' : ''}`;

        res.forEach(item => {
            const disable = item.stock_actual <= 0;
            const precioRef = userRole === 'ADMIN' ? item.precio_mayorista : item.precio_minorista;
            const itemJson = JSON.stringify(item).replace(/'/g, "\\'").replace(/"/g, '&quot;');

            container.innerHTML += `
                <div class="col-12 col-md-6">
                    <div class="product-card-pos d-flex align-items-center gap-3 ${disable ? 'opacity-50' : ''}" 
                         data-item="${itemJson}" ${disable ? '' : `onclick="agregarAlCarrito(buscarPosResults.find(i => i.variante_id === ${item.variante_id}))"`}>
                        <div class="product-thumb">
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
                </div>
            `;
        });

        // Cargar imágenes de productos en los thumbnails
        cargarThumbsProductos(res);

    } catch (e) { console.error(e); }
}

// Cargar imágenes de productos (lazy)
async function cargarThumbsProductos(items) {
    const productIds = [...new Set(items.map(i => i.producto_id))];
    for (const pid of productIds) {
        try {
            const imgs = await fetchAPI(`/productos/${pid}/imagenes`);
            if (imgs && imgs.length > 0) {
                const principal = imgs.find(i => i.es_principal) || imgs[0];
                // Encontrar todos los thumbs de este producto y actualizar
                const cards = document.querySelectorAll('.product-card-pos');
                cards.forEach(card => {
                    try {
                        const parsedData = card.dataset.item ? card.dataset.item.replace(/&quot;/g, '"') : '{}';
                        const cardItem = JSON.parse(parsedData);
                        if (cardItem.producto_id === pid) {
                            const thumb = card.querySelector('.product-thumb');
                            if (thumb) thumb.innerHTML = `<img src="${API_URL.replace('/api', '')}${principal.ruta}" alt="thumb" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
                        }
                    } catch (e) {
                        console.error("Error parseando data-item", e);
                    }
                });
            }
        } catch (e) { console.error("Error fetching img", e); }
    }
}

function agregarAlCarrito(prod) {
    // Verificar si ya existe en el carrito
    const existe = carritoPos.find(i => i.variante_id === prod.variante_id);
    if (existe) {
        if (existe.cantidad < prod.stock_actual) {
            existe.cantidad++;
        } else {
            alert('No hay más stock disponible para este producto.');
        }
    } else {
        carritoPos.push({
            variante_id: prod.variante_id,
            producto_id: prod.producto_id,
            nombre: `${prod.nombre} [${prod.talla}]`,
            color: prod.color || '-',
            precio_mayorista: prod.precio_mayorista,
            precio_minorista: prod.precio_minorista,
            cantidad: 1,
            sku: prod.sku,
            max_stock: prod.stock_actual
        });
    }
    actualizarCarrito();
}

function actualizarCarrito() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    // Identificar tipo de precio seleccionado
    const pRadio = document.querySelector('input[name="tipoPrecio"]:checked');
    const tipoPrecio = pRadio ? pRadio.value : 'minorista'; // fallback

    let subtotal = 0;
    container.innerHTML = '';

    carritoPos.forEach((item, idx) => {
        const precioListado = tipoPrecio === 'minorista' ? item.precio_minorista : item.precio_mayorista;
        const totalFila = precioListado * item.cantidad;
        subtotal += totalFila;

        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-thumb">
                    <i class="bi bi-box-seam" style="font-size:0.9rem;"></i>
                </div>
                <div class="flex-grow-1 min-w-0">
                    <div class="fw-bold color-dark text-truncate" style="font-size:0.82rem;">${item.nombre}</div>
                    <div class="text-muted" style="font-size:0.7rem;">${item.sku} · ${formatCurrency(precioListado)} c/u</div>
                </div>
                <div class="qty-controls">
                    <button type="button" class="qty-btn minus" onclick="cambiarCant(${idx}, -1)">−</button>
                    <span class="fw-bold" style="font-size:0.9rem; min-width:20px; text-align:center;">${item.cantidad}</span>
                    <button type="button" class="qty-btn plus" onclick="cambiarCant(${idx}, 1)">+</button>
                </div>
                <div class="text-end" style="min-width:70px;">
                    <div class="fw-bold color-dark" style="font-size:0.85rem;">${formatCurrency(totalFila)}</div>
                </div>
                <button type="button" class="btn btn-sm p-0 text-danger" style="opacity:0.5; font-size:0.8rem;" onclick="quitarCart(${idx})" title="Quitar">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;
    });

    if (carritoPos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <i class="bi bi-cart-x d-block mb-2" style="font-size:1.8rem; opacity:0.3;"></i>
                El carrito está vacío
            </div>`;
    }

    // Cargar imágenes en los items del carrito
    cargarThumbsCarrito();

    // Cálculo de descuentos
    const inputDescPorcentaje = document.getElementById('descPromedio');
    const inputDescFijo = document.getElementById('descFijo');

    let descPct = (inputDescPorcentaje && parseFloat(inputDescPorcentaje.value)) || 0;
    let descFijo = (inputDescFijo && parseFloat(inputDescFijo.value)) || 0;

    let totalDescuentoCalculado = (subtotal * (descPct / 100)) + descFijo;

    // Evitar descuentos mayores al subtotal
    if (totalDescuentoCalculado > subtotal) {
        totalDescuentoCalculado = subtotal;
    }

    let totalFinal = subtotal - totalDescuentoCalculado;

    document.getElementById('cartCount').textContent = `${carritoPos.length} items`;
    document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);
    const cartDescEl = document.getElementById('cartDescuento');
    if (cartDescEl) cartDescEl.textContent = `-${formatCurrency(totalDescuentoCalculado)}`;
    document.getElementById('cartTotal').textContent = formatCurrency(totalFinal);

    // Render discount chips
    const chipsContainer = document.getElementById('discountChips');
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        if (descPct > 0) chipsContainer.innerHTML += `<span class="discount-chip percent"><i class="bi bi-percent"></i> ${descPct}% off</span> `;
        if (descFijo > 0) chipsContainer.innerHTML += `<span class="discount-chip fixed"><i class="bi bi-cash"></i> $${descFijo} off</span>`;
    }
}

// Cargar thumbs del carrito (lazy)
async function cargarThumbsCarrito() {
    const productIds = [...new Set(carritoPos.map(i => i.producto_id).filter(Boolean))];
    for (const pid of productIds) {
        try {
            const imgs = await fetchAPI(`/productos/${pid}/imagenes`);
            if (imgs && imgs.length > 0) {
                const principal = imgs.find(i => i.es_principal) || imgs[0];
                const thumbs = document.querySelectorAll('.cart-thumb');
                carritoPos.forEach((item, idx) => {
                    if (item.producto_id === pid && thumbs[idx]) {
                        thumbs[idx].innerHTML = `<img src="${API_URL.replace('/api', '')}${principal.ruta}" alt="thumb" style="width:100%;height:100%;object-fit:cover;">`;
                    }
                });
            }
        } catch (e) { }
    }
}

function cambiarCant(idx, diff) {
    const item = carritoPos[idx];
    const n = item.cantidad + diff;
    if (n > 0 && n <= item.max_stock) {
        item.cantidad = n;
        actualizarCarrito();
    } else if (n > item.max_stock) {
        alert('Stock insuficiente. Max: ' + item.max_stock);
    }
}

function quitarCart(idx) {
    carritoPos.splice(idx, 1);
    actualizarCarrito();
}

const formCheckout = document.getElementById('formCheckout');
if (formCheckout) {
    formCheckout.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (carritoPos.length === 0) return alert('El carrito está vacío');

        const cliente = document.getElementById('clientNombre').value;
        const tel = document.getElementById('clientTel').value;

        const pRadio = document.querySelector('input[name="tipoPrecio"]:checked');
        const tipoPrecio = pRadio ? pRadio.value : 'minorista';

        let totalSubtotalBruto = 0;
        const detalles = carritoPos.map(i => {
            const pu = tipoPrecio === 'minorista' ? i.precio_minorista : i.precio_mayorista;
            totalSubtotalBruto += (pu * i.cantidad);
            return {
                variante_id: i.variante_id,
                cantidad: i.cantidad,
                precio_unitario: pu
            };
        });

        // Cálculo de totales con descuento al realizar la venta
        const inputDescPorcentaje = document.getElementById('descPromedio');
        const inputDescFijo = document.getElementById('descFijo');
        let descPct = (inputDescPorcentaje && parseFloat(inputDescPorcentaje.value)) || 0;
        let descFijo = (inputDescFijo && parseFloat(inputDescFijo.value)) || 0;

        let totalDescuentoCalculado = (totalSubtotalBruto * (descPct / 100)) + descFijo;
        if (totalDescuentoCalculado > totalSubtotalBruto) totalDescuentoCalculado = totalSubtotalBruto;
        let totalCostoFinal = totalSubtotalBruto - totalDescuentoCalculado;

        // Modificamos el payload. Ojo: La comisión en backend se debería calcular sobre el total final o subtotal.
        // El backend acepta el campo 'total' y lo usamos tal cual (el backend confía en este total para la comisión por ahora, lo cual es ideal para ventas con rebajas).
        const payload = {
            cliente_nombre: cliente,
            contacto: tel,
            total: totalCostoFinal, // total facturado
            detalles
        };

        try {
            await fetchAPI('/ventas', { method: 'POST', body: JSON.stringify(payload) });

            // Mostrar modal success
            const modalEl = document.getElementById('modalVentaOk');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

            // Configurar boton de whatsapp
            const numProd = carritoPos.length === 1 ? carritoPos[0].nombre : `${carritoPos.length} productos`;
            let msjDescuentoStr = totalDescuentoCalculado > 0 ? ` (Descuento aplicado de ${formatCurrency(totalDescuentoCalculado)})` : '';
            const msjWa = `¡Hola ${cliente}! Gracias por tu compra. Tu pedido de ${numProd}${msjDescuentoStr} con un total final de ${formatCurrency(totalCostoFinal)} ha sido registrado con éxito. ¡Que las disfrutes!`;
            const waLink = document.getElementById('waBtnVenta');
            waLink.href = `https://wa.me/${tel}?text=${encodeURIComponent(msjWa)}`;

        } catch (error) {
            alert('Error al realizar venta: ' + error.message);
        }
    });
}

function nuevaVentaPOS() {
    carritoPos = [];
    document.getElementById('clientNombre').value = '';
    document.getElementById('clientTel').value = '';
    if (document.getElementById('descPromedio')) document.getElementById('descPromedio').value = '';
    if (document.getElementById('descFijo')) document.getElementById('descFijo').value = '';

    actualizarCarrito();

    // refetch stock
    buscarPos();

    const modalEl = document.getElementById('modalVentaOk');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

// 5. DASHBOARD Y ESTADÍSTICAS (ADMIN)
async function cargarDashboard() {
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

async function cargarHistorialAdmin() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    // Carga paralela de ambos historiales
    Promise.all([
        cargarHistorialVendedores(),
        cargarHistorialClientes(),
        cargarTopProductos()
    ]).catch(e => console.error("Error en historiales:", e));
}

async function cargarHistorialVendedores() {
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
        tr.className = 'border-bottom border-light align-middle'; // Estética premium (Soft line)
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

async function cargarHistorialClientes() {
    const tbody = document.getElementById('historialClientesBody');
    if (!tbody) return;

    const clientes = await fetchAPI('/stats/historial-clientes');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aún no hay clientes registrados.</td></tr>';
        return;
    }

    // Mostramos solo los top 4 clientes
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

async function cargarTopProductos() {
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

// 6. GESTIÓN DE PERSONAL (ADMIN)
async function cargarListaUsuarios() {
    if (!window.location.pathname.endsWith('vendedores.html')) return;
    const tbody = document.getElementById('listaUsuariosBody');
    if (!tbody) return;

    try {
        const usuarios = await fetchAPI('/usuarios');
        tbody.innerHTML = '';
        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No existen usuarios aún.</td></tr>';
            return;
        }

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'border-bottom border-light align-middle';
            const badgeRol = u.rol === 'ADMIN' ? '<span class="badge bg-dark rounded-pill ms-2" style="font-size:0.65rem">ADMIN</span>' : '';

            tr.innerHTML = `
                <td class="py-3">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light text-secondary me-3 d-flex justify-content-center align-items-center" style="width:36px; height:36px">
                            <i class="bi bi-person-fill"></i>
                        </div>
                        <span class="fw-semibold color-dark">${u.nombre}</span>
                    </div>
                </td>
                <td class="py-3">
                    ${u.rol === 'ADMIN' ? '<span class="badge rounded-pill bg-dark">ADMIN</span>' : '<span class="badge border border-secondary text-secondary rounded-pill bg-transparent">VENDEDOR</span>'}
                </td>
                <td class="py-3 fw-medium ${u.rol === 'ADMIN' ? 'text-muted' : 'text-success'}">
                    ${u.rol === 'ADMIN' ? '-' : u.porcentaje_comision + '%'}
                </td>
                <td class="py-3 text-end">
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm me-1" style="width:32px; height:32px; padding:0;" onclick="editarUsuario(${u.id}, '${u.nombre}', '${u.rol}', ${u.porcentaje_comision})" title="Editar">
                        <i class="bi bi-pencil-square text-secondary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm" style="width:32px; height:32px; padding:0;" onclick="eliminarUsuario(${u.id})" title="Eliminar">
                        <i class="bi bi-trash-fill text-danger"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error cargando usuarios:', e);
    }
}

// Configurar formulario de usuarios
const formUsuario = document.getElementById('formUsuario');
if (formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('userId').value;
        const nombre = document.getElementById('userNombre').value.trim();
        const password = document.getElementById('userPassword').value;
        const rol = document.getElementById('userRol').value;
        const pComision = parseFloat(document.getElementById('userComision').value) || 0;

        const url = id ? `/usuarios/${id}` : '/usuarios';
        const method = id ? 'PUT' : 'POST';

        if (!id && !password) return alert('La contraseña es obligatoria para un nuevo usuario.');

        const payload = { nombre, rol, porcentaje_comision: pComision };
        if (password) payload.password = password;

        try {
            await fetchAPI(url, { method, body: JSON.stringify(payload) });
            const modalEl = document.getElementById('modalUsuario');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            cargarListaUsuarios();
        } catch (error) {
            alert('Error al guardar usuario: ' + error.message);
        }
    });

    // Limpiar form al abrir modal nuevo
    document.getElementById('modalUsuario').addEventListener('show.bs.modal', function (event) {
        if (!event.relatedTarget || !event.relatedTarget.closest('.btn-light')) {
            // Es editar, no limpiar
        } else {
            // Nuevo usuario
            document.getElementById('userId').value = '';
            document.getElementById('formUsuario').reset();
            document.getElementById('modalUsuarioLabel').textContent = 'Nuevo Integrante de Staff';
            document.getElementById('userPasswordHelp').textContent = 'Requerida al crear un nuevo usuario.';
        }
    });
}

function editarUsuario(id, nombre, rol, comision) {
    document.getElementById('userId').value = id;
    document.getElementById('userNombre').value = nombre;
    document.getElementById('userPassword').value = '';
    document.getElementById('userRol').value = rol;
    document.getElementById('userComision').value = comision;

    document.getElementById('modalUsuarioLabel').textContent = 'Editar Integrante';
    document.getElementById('userPasswordHelp').textContent = 'Dejar vacío si no se desea cambiar.';

    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modal.show();
}

async function eliminarUsuario(id) {
    if (confirm('¿Estás seguro de eliminar este usuario del staff?')) {
        try {
            await fetchAPI(`/usuarios/${id}`, { method: 'DELETE' });
            cargarListaUsuarios();
        } catch (e) {
            alert('Error eliminando usuario: ' + e.message);
        }
    }
}

