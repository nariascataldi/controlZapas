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
    import('./pos.js').then(m => {
        m.buscarPos();
        
        const inputEl = document.getElementById('posBuscador');
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    m.buscarPos(true);
                }
            });
            inputEl.addEventListener('input', () => m.buscarPos(false));
        }
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
