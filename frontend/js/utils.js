export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function getImageUrl(ruta, apiUrl = '') {
    if (!ruta) return '';
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
        return ruta;
    }
    if (ruta.startsWith('/uploads/')) {
        return (apiUrl || '').replace('/api', '') + ruta;
    }
    return ruta;
}
