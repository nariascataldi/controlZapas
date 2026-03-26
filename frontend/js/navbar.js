import { getUser } from './auth.js';

export function configurarNavBar() {
    const user = getUser();
    const navLinks = document.getElementById('navLinks');
    const navBrand = document.getElementById('navBrand');

    if (!navLinks) return;

    navLinks.innerHTML = `
        ${user.rol === 'ADMIN' ? `<li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>` : ''}
        <li class="nav-item"><a class="nav-link" href="stock.html">Inventario</a></li>
        <li class="nav-item"><a class="nav-link" href="ventas.html">Punto de Venta</a></li>
        <li class="nav-item"><a class="nav-link" href="historial.html">Historial</a></li>
        ${user.rol === 'ADMIN' ? `<li class="nav-item"><a class="nav-link" href="vendedores.html">Vendedores</a></li>` : ''}
        <li class="nav-item ms-lg-3 d-flex align-items-center">
            <span class="text-white-50 small me-3"><i class="bi bi-person-circle"></i> ${user.nombre}</span>
            <button class="btn btn-outline-light btn-sm" id="logoutBtn">Salir</button>
        </li>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => import('./auth.js').then(m => m.logout()));
    }

    if (navBrand && user.rol === 'ADMIN') {
        navBrand.innerHTML += ` <span class="badge bg-secondary ms-2 small">Admin</span>`;
    }
}
