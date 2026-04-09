import { configurarNavBar } from './navbar.js';
import { verificarAcceso } from './auth.js';

configurarNavBar();

if (window.location.pathname.endsWith('stock.html')) {
    import('./stock.js').then(m => {
        m.cargarInventario();
        
        const searchInput = document.getElementById('busquedaStock');
        if (searchInput) {
            searchInput.addEventListener('input', m.filtrarStock);
        }
    });
}

if (window.location.pathname.endsWith('ventas.html')) {
    import('./pos.js').then(async m => {
        const { debounce } = await import('./utils.js');
        m.buscarPos();
        
        const inputEl = document.getElementById('posBuscador');
        const searchBtn = document.getElementById('buscarPosBtn');
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    m.buscarPos(true);
                }
            });
            inputEl.addEventListener('input', debounce(() => m.buscarPos(false), 300));
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => m.buscarPos(true));
        }

        // Tipo de Precio
        document.querySelectorAll('.pill-option').forEach(btn => {
            btn.addEventListener('click', () => m.cambiarTipoPrecio(btn));
        });

        // Descuentos
        document.getElementById('descPromedio')?.addEventListener('input', () => m.actualizarCarrito());
        document.getElementById('descFijo')?.addEventListener('input', () => m.actualizarCarrito());

        // Botón Nueva Venta (Modal)
        document.getElementById('btnNuevaVenta')?.addEventListener('click', () => m.nuevaVentaPOS());
    });
}

if (window.location.pathname.endsWith('dashboard.html')) {
    verificarAcceso('ADMIN');
    import('./dashboard.js').then(m => {
        m.cargarDashboard();
        m.cargarHistorialAdmin();
    });
}

if (window.location.pathname.endsWith('vendedores.html')) {
    verificarAcceso('ADMIN');
    import('./usuarios.js').then(m => {
        m.cargarListaUsuarios();
    });
}

if (window.location.pathname.endsWith('historial.html')) {
    import('./historial.js').then(m => {
        m.initHistorial();
    });
}
