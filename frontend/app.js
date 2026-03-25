const API_URL = 'http://localhost:3000/api';

// --- UTILIDADES GLOBALES ---

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(amount);
}

function getToken() {
    return localStorage.getItem('cz_token');
}

function getUser() {
    return JSON.parse(localStorage.getItem('cz_user'));
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
    
    if(!navLinks) return;

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

    if(navBrand && user.rol === 'ADMIN') {
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

// 2. DASHBOARD
async function cargarDashboard() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    try {
        const data = await fetchAPI('/ventas/dashboard');
        if(data) {
            document.getElementById('widgetTotalVentas').textContent = formatCurrency(data.ventas_totales || 0);
            document.getElementById('widgetUnidades').textContent = data.unidades_vendidas || 0;
            document.getElementById('widgetStockCritico').textContent = data.stock_critico || 0;
        }
    } catch (e) {
        console.error(e);
    }
}

async function cargarHistorialAdmin() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    try {
        const data = await fetchAPI('/ventas');
        const tbody = document.getElementById('historialVentasBo');
        if (data && tbody) {
            tbody.innerHTML = '';
            // Mostrar últimos 10
            data.slice(0, 10).forEach(v => {
                const date = new Date(v.fecha).toLocaleString('es-UY');
                tbody.innerHTML += `
                    <tr>
                        <td class="text-muted fw-bold">#${v.id}</td>
                        <td>${date}</td>
                        <td class="fw-medium">${v.cliente}</td>
                        <td><span class="badge bg-light text-dark">${v.vendedor}</span></td>
                        <td class="text-end fw-bold text-success">${formatCurrency(v.total)}</td>
                        <td class="text-end text-muted small">${formatCurrency(v.comision_calculada)}</td>
                    </tr>
                `;
            });
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aún no hay ventas registradas</td></tr>';
            }
        }
    } catch (e) { console.error(e); }
}

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
        if(getUser().rol === 'ADMIN') {
            document.getElementById('btnAdminNuevoProd').classList.remove('d-none');
        }
    } catch (e) { console.error(e); }
}

function bgAlert(stock, min) {
    if(stock === 0) return 'bg-danger text-white';
    if(stock <= min) return 'bg-warning text-dark';
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
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const userRole = getUser().rol;

    lista.forEach(item => {
        const pMostrar = userRole === 'ADMIN' ? 
            `Max: ${formatCurrency(item.precio_mayorista)}<br><small class="text-muted">Min: ${formatCurrency(item.precio_minorista)}</small>` :
            `${formatCurrency(item.precio_minorista)}`;

        // Si no hay variante (producto sin hijos aún), omitimos pintar filas de data o la pintamos vacía
        if(!item.sku) return; 

        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="fw-bold color-dark">${item.nombre}</div>
                    <div class="small text-muted">${item.marca || 'Sin marca'}</div>
                </td>
                <td><span class="badge bg-light text-dark me-2">${item.color || 'N/A'}</span> <span class="badge bg-secondary">${item.talla}</span></td>
                <td class="fw-medium font-monospace small">${item.sku}</td>
                <td>${pMostrar}</td>
                <td><span class="badge rounded-pill ${bgAlert(item.stock_actual, item.stock_minimo)} px-3 py-2">${item.stock_actual} unid.</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-success border-2 rounded-3" onclick='generarLinkWhatsapp(${JSON.stringify(item)})' title="WhatsApp Disp.">
                        <i class="bi bi-whatsapp"></i> WA
                    </button>
                    ${userRole === 'ADMIN' ? `
                    <button class="btn btn-sm btn-outline-primary border-2 rounded-3 ms-1" onclick="promptAjustarStock(${item.variante_id}, '${item.stock_actual}')" title="Ajustar Stock">
                        <i class="bi bi-box-seam"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
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

    if(!s || !t || isNaN(st)) return alert('Llena SKU, Talla y Stock');

    variantesTemporales.push({sku:s, color:c, talla:t, stock_actual:st, stock_minimo:m||0});
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
    formNuevoP.addEventListener('submit', async(e) => {
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

async function promptAjustarStock(varId, stockActual) {
    const nuevoStock = prompt('Ingresa la nueva cantidad en inventario:', stockActual);
    if(nuevoStock !== null && !isNaN(nuevoStock)) {
        try {
            await fetchAPI(`/productos/variantes/${varId}/stock`, { method: 'PUT', body: JSON.stringify({ stock_actual: parseInt(nuevoStock) }) });
            cargarInventario(); // refetch
        } catch (e) { alert(e.message); }
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
        if(res.length === 0) {
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
            const precioRef = userRole==='ADMIN' ? item.precio_mayorista : item.precio_minorista;
            const itemJson = JSON.stringify(item).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            container.innerHTML += `
                <div class="col-12 col-md-6">
                    <div class="product-card-pos d-flex align-items-center gap-3 ${disable ? 'opacity-50':''}" 
                         ${disable ? '' : `onclick="agregarAlCarrito(JSON.parse(this.dataset.item))" data-item="${itemJson}"`}>
                        <div class="product-thumb">
                            <i class="bi bi-box-seam"></i>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <div class="fw-bold text-truncate color-dark" style="font-size:0.9rem;" title="${item.nombre}">${item.nombre}</div>
                            <div class="d-flex gap-1 mt-1 flex-wrap">
                                <span class="badge" style="background:#eff1f2; color:#595c5d; font-weight:500;">${item.color||'-'}</span>
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

    } catch(e) { console.error(e); }
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
                        const cardItem = JSON.parse(card.dataset.item || '{}');
                        if (cardItem.producto_id === pid) {
                            const thumb = card.querySelector('.product-thumb');
                            if (thumb) thumb.innerHTML = `<img src="${API_URL.replace('/api','')}${principal.ruta}" alt="thumb">`;
                        }
                    } catch(e) {}
                });
            }
        } catch(e) {}
    }
}

function agregarAlCarrito(prod) {
    // Verificar si ya existe en el carrito
    const existe = carritoPos.find(i => i.variante_id === prod.variante_id);
    if (existe) {
        if(existe.cantidad < prod.stock_actual) {
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
    if(!container) return;
    
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

    if(carritoPos.length === 0) {
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
    if(totalDescuentoCalculado > subtotal) {
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
                        thumbs[idx].innerHTML = `<img src="${API_URL.replace('/api','')}${principal.ruta}" alt="thumb" style="width:100%;height:100%;object-fit:cover;">`;
                    }
                });
            }
        } catch(e) {}
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
if(formCheckout) {
    formCheckout.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if(carritoPos.length === 0) return alert('El carrito está vacío');

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
        if(totalDescuentoCalculado > totalSubtotalBruto) totalDescuentoCalculado = totalSubtotalBruto;
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
    if(document.getElementById('descPromedio')) document.getElementById('descPromedio').value = '';
    if(document.getElementById('descFijo')) document.getElementById('descFijo').value = '';
    
    actualizarCarrito();
    
    // refetch stock
    buscarPos();
    
    const modalEl = document.getElementById('modalVentaOk');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if(modal) modal.hide();
}
