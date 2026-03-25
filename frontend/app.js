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
            await fetchAPI('/productos', { method: 'POST', body: JSON.stringify(payload) });
            alert('Producto Guardado!');
            // Cerrar modal sucio pero efectivo sin jQuery:
            const modalEl = document.getElementById('modalNuevoProd');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Recargar e inicializar
            formNuevoP.reset();
            variantesTemporales=[];
            renderVariantesTemp();
            cargarInventario();
        } catch (e) { alert('Error: ' + e.message); }
    });
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
                inputEl.value = ''; // Limpiamos para el siguiente escaneo
                // Restauramos resultados completos
                return buscarPos(false); 
            } else if (res.length === 1 && res[0].stock_actual > 0) {
                // Alternativamente, si la busqueda generica devuelve exactamente un resultado
                agregarAlCarrito(res[0]);
                inputEl.value = '';
                return buscarPos(false);
            }
        }

        res.forEach(item => {
            const disable = item.stock_actual <= 0 ? 'disabled' : '';
            const precioRef = userRole==='ADMIN' ? item.precio_mayorista : item.precio_minorista;
            
            container.innerHTML += `
                <div class="col-12 col-md-6 col-xl-4">
                    <div class="card card-hover-kinetic align-items-center flex-row p-2 ${disable ? 'opacity-50':''}" style="cursor: pointer" 
                         ${disable ? '' : `onclick='agregarAlCarrito(${JSON.stringify(item)})'`}>
                        <div class="bg-light rounded-3 p-3 text-center me-3 color-primary">
                            <i class="bi bi-box-seam fs-3"></i>
                        </div>
                        <div>
                            <h6 class="mb-1 fw-bold text-truncate" style="max-width: 140px;" title="${item.nombre}">${item.nombre}</h6>
                            <div class="small">
                                <span class="badge bg-light text-dark">${item.color||'-'} / ${item.talla}</span> 
                            </div>
                            <div class="mt-1 fw-bold color-dark">${formatCurrency(precioRef)} ${disable ? '<span class="text-danger ms-2 small">Sin Stock</span>': ''}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.error(e); }
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
            nombre: `${prod.nombre} [${prod.talla}]`,
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
    const tbody = document.getElementById('cartItems');
    if(!tbody) return;
    
    // Identificar tipo de precio seleccionado
    const pRadio = document.querySelector('input[name="tipoPrecio"]:checked');
    const tipoPrecio = pRadio ? pRadio.value : 'minorista'; // fallback

    let subtotal = 0;
    tbody.innerHTML = '';
    
    carritoPos.forEach((item, idx) => {
        const precioListado = tipoPrecio === 'minorista' ? item.precio_minorista : item.precio_mayorista;
        const totalFila = precioListado * item.cantidad;
        subtotal += totalFila;

        tbody.innerHTML += `
            <tr class="cart-item-row">
                <td>
                    <div class="fw-bold color-dark small">${item.nombre}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${item.sku} | ${formatCurrency(precioListado)} c/u</div>
                </td>
                <td style="width: 110px;">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary" type="button" onclick="cambiarCant(${idx}, -1)">-</button>
                        <input type="text" class="form-control text-center px-1" value="${item.cantidad}" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="cambiarCant(${idx}, 1)">+</button>
                    </div>
                </td>
                <td class="text-end fw-bold color-dark">
                    ${formatCurrency(totalFila)}
                </td>
                <td class="text-end px-1">
                    <button class="btn btn-sm btn-light text-danger rounded-circle" onclick="quitarCart(${idx})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });

    if(carritoPos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted small">El carrito está vacío</td></tr>';
    }

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
