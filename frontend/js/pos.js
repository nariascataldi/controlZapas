import { fetchAPI, API_URL } from './api.js';
import { getUser } from './auth.js';
import { formatCurrency } from './utils.js';

let carritoPos = [];
let buscarPosResults = [];

export async function buscarPos(fueEnter = false) {
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

        if (fueEnter && query.length > 0) {
            const exactaSKU = res.find(item => item.sku && item.sku.toLowerCase() === query.toLowerCase());
            if (exactaSKU && exactaSKU.stock_actual > 0) {
                agregarAlCarrito(exactaSKU);
                inputEl.value = '';
                const scannerEl = document.querySelector('.scanner-input');
                if (scannerEl) { scannerEl.classList.add('scanner-flash'); setTimeout(() => scannerEl.classList.remove('scanner-flash'), 500); }
                return buscarPos(false);
            } else if (res.length === 1 && res[0].stock_actual > 0) {
                agregarAlCarrito(res[0]);
                inputEl.value = '';
                return buscarPos(false);
            }
        }

        const countEl = document.getElementById('posResultCount');
        if (countEl) countEl.textContent = `${res.length} producto${res.length !== 1 ? 's' : ''} encontrado${res.length !== 1 ? 's' : ''}`;

        res.forEach(item => {
            const disable = item.stock_actual <= 0;
            const precioRef = userRole === 'ADMIN' ? item.precio_mayorista : item.precio_minorista;
            const itemJson = JSON.stringify(item).replace(/'/g, "\\'").replace(/"/g, '&quot;');

            container.innerHTML += `
                <div class="col-12 col-md-6">
                    <div class="product-card-pos d-flex align-items-center gap-3 ${disable ? 'opacity-50' : ''}" 
                         data-item="${itemJson}" ${disable ? '' : `onclick="agregarAlCarritoById(${item.variante_id})"`}>
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

        cargarThumbsProductos(res);

    } catch (e) { console.error(e); }
}

export async function cargarThumbsProductos(items) {
    const productIds = [...new Set(items.map(i => i.producto_id))];
    for (const pid of productIds) {
        try {
            const imgs = await fetchAPI(`/productos/${pid}/imagenes`);
            if (imgs && imgs.length > 0) {
                const principal = imgs.find(i => i.es_principal) || imgs[0];
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

export function agregarAlCarritoById(varianteId) {
    const prod = buscarPosResults.find(i => i.variante_id === varianteId);
    if (!prod) {
        console.error('Producto no encontrado en los resultados de búsqueda:', varianteId);
        return;
    }
    agregarAlCarrito(prod);
}

export function agregarAlCarrito(prod) {
    if (!prod || !prod.variante_id) return;
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

export function actualizarCarrito() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    const pRadio = document.querySelector('input[name="tipoPrecio"]:checked');
    const tipoPrecio = pRadio ? pRadio.value : 'minorista';

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

    cargarThumbsCarrito();

    const inputDescPorcentaje = document.getElementById('descPromedio');
    const inputDescFijo = document.getElementById('descFijo');

    let descPct = (inputDescPorcentaje && parseFloat(inputDescPorcentaje.value)) || 0;
    let descFijo = (inputDescFijo && parseFloat(inputDescFijo.value)) || 0;

    let totalDescuentoCalculado = (subtotal * (descPct / 100)) + descFijo;

    if (totalDescuentoCalculado > subtotal) {
        totalDescuentoCalculado = subtotal;
    }

    let totalFinal = subtotal - totalDescuentoCalculado;

    document.getElementById('cartCount').textContent = `${carritoPos.length} items`;
    document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);
    const cartDescEl = document.getElementById('cartDescuento');
    if (cartDescEl) cartDescEl.textContent = `-${formatCurrency(totalDescuentoCalculado)}`;
    document.getElementById('cartTotal').textContent = formatCurrency(totalFinal);

    const chipsContainer = document.getElementById('discountChips');
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        if (descPct > 0) chipsContainer.innerHTML += `<span class="discount-chip percent"><i class="bi bi-percent"></i> ${descPct}% off</span> `;
        if (descFijo > 0) chipsContainer.innerHTML += `<span class="discount-chip fixed"><i class="bi bi-cash"></i> $${descFijo} off</span>`;
    }
}

export async function cargarThumbsCarrito() {
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

export function cambiarCant(idx, diff) {
    const item = carritoPos[idx];
    const n = item.cantidad + diff;
    if (n > 0 && n <= item.max_stock) {
        item.cantidad = n;
        actualizarCarrito();
    } else if (n > item.max_stock) {
        alert('Stock insuficiente. Max: ' + item.max_stock);
    }
}

export function quitarCart(idx) {
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

        const inputDescPorcentaje = document.getElementById('descPromedio');
        const inputDescFijo = document.getElementById('descFijo');
        let descPct = (inputDescPorcentaje && parseFloat(inputDescPorcentaje.value)) || 0;
        let descFijo = (inputDescFijo && parseFloat(inputDescFijo.value)) || 0;

        let totalDescuentoCalculado = (totalSubtotalBruto * (descPct / 100)) + descFijo;
        if (totalDescuentoCalculado > totalSubtotalBruto) totalDescuentoCalculado = totalSubtotalBruto;
        let totalCostoFinal = totalSubtotalBruto - totalDescuentoCalculado;

        const payload = {
            cliente_nombre: cliente,
            contacto: tel,
            total: totalCostoFinal,
            detalles
        };

        try {
            await fetchAPI('/ventas', { method: 'POST', body: JSON.stringify(payload) });

            const modalEl = document.getElementById('modalVentaOk');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

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

export function nuevaVentaPOS() {
    carritoPos = [];
    document.getElementById('clientNombre').value = '';
    document.getElementById('clientTel').value = '';
    if (document.getElementById('descPromedio')) document.getElementById('descPromedio').value = '';
    if (document.getElementById('descFijo')) document.getElementById('descFijo').value = '';

    actualizarCarrito();
    buscarPos();

    const modalEl = document.getElementById('modalVentaOk');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

window.buscarPos = buscarPos;
window.agregarAlCarrito = agregarAlCarrito;
window.agregarAlCarritoById = agregarAlCarritoById;
window.actualizarCarrito = actualizarCarrito;
window.cambiarCant = cambiarCant;
window.quitarCart = quitarCart;
window.nuevaVentaPOS = nuevaVentaPOS;

// Exponer variables de estado para el onclick del HTML
window.buscarPosResults = buscarPosResults;
window.carritoPos = carritoPos;
