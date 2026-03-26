export const API_URL = '/api';

export async function fetchAPI(endpoint, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('cz_token');
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        if (response.status === 401 || response.status === 403) {
            alert('Sesión expirada o acceso denegado.');
            import('./auth.js').then(m => m.logout());
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
