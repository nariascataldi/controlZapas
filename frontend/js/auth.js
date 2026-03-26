import { fetchAPI } from './api.js';

export function getToken() {
    return localStorage.getItem('cz_token');
}

export function getUser() {
    try {
        const u = localStorage.getItem('cz_user');
        return u ? JSON.parse(u) : {};
    } catch (e) { return {}; }
}

export function logout() {
    localStorage.removeItem('cz_token');
    localStorage.removeItem('cz_user');
    window.location.href = 'login.html';
}

export function verificarAcceso(rolRequerido = null) {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    if (rolRequerido && user.rol !== rolRequerido) {
        window.location.href = 'index.html';
    }
}

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

window.logout = logout;
window.verificarAcceso = verificarAcceso;
window.getUser = getUser;
window.getToken = getToken;
