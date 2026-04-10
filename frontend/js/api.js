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

        // Handle auth errors
        if (response.status === 401 || response.status === 403) {
            alert('Sesión expirada o acceso denegado.');
            import('./auth.js').then(m => m.logout());
            return null;
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Server returned non-JSON response (likely HTML error page)
            const text = await response.text();
            console.error('[API] Non-JSON response:', text.substring(0, 200));
            throw new Error('Error del servidor: respuesta inválida. Intente nuevamente.');
        }

        const data = await response.json();
        
        // Handle API errors
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Error en la petición');
        }
        
        return data;
    } catch (error) {
        // Network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('[API] Network error:', error.message);
            throw new Error('Error de conexión. Verifique su conexión a internet.');
        }
        
        // Re-throw if it's already our custom error
        if (error.message.includes('Error del servidor') || error.message.includes('Error de conexión')) {
            throw error;
        }
        
        console.error('API Error:', error);
        throw error;
    }
}
