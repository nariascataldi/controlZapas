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
        const userInput = document.getElementById('inputUser');
        const passwordInput = document.getElementById('inputPassword');

        userInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                passwordInput?.focus();
            }
        });

        passwordInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                form.requestSubmit();
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('inputUser').value;
            const p = document.getElementById('inputPassword').value;
            const alertBox = document.getElementById('loginAlert');
            const submitBtn = form.querySelector('button[type="submit"]');

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Ingresando...';
            alertBox.classList.add('d-none');

            try {
                const data = await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ nombre: u, password: p })
                });

                if (data && data.token) {
                    localStorage.setItem('cz_token', data.token);
                    localStorage.setItem('cz_user', JSON.stringify(data.usuario));
                    alertBox.innerHTML = '<i class="bi bi-check-circle me-2"></i>¡Login exitoso! Redirigiendo...';
                    alertBox.className = 'alert alert-success py-2 small border-0';
                    alertBox.classList.remove('d-none');
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                }
            } catch (error) {
                // Display user-friendly error message
                alertBox.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${error.message}`;
                alertBox.className = 'alert alert-danger py-2 small border-0';
                alertBox.classList.remove('d-none');
                
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    alertBox.classList.add('d-none');
                }, 5000);
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Ingresar al Sistema <i class="bi bi-arrow-right-short ms-1 fs-5 align-middle" aria-hidden="true"></i>';
            }
        });
    }
}

window.logout = logout;
window.verificarAcceso = verificarAcceso;
window.getUser = getUser;
window.getToken = getToken;
