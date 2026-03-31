export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(amount);
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
