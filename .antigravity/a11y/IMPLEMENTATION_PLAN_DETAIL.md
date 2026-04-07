# Plan Detallado de Implementación A11y

## Objetivos
- Cumplimiento **WCAG 2.1 Nivel AA**
- Cumplimiento **ISO 30071-1**
- 100% errores críticos/serios de accesibilidad corregidos

---

## Fase 1: Auditoría Inicial

### 1.1 Auditoría Automatizada (FrontendTester)

**Herramientas**: axe-core, Lighthouse

**Archivos a auditar**:
- [ ] `frontend/login.html`
- [ ] `frontend/index.html`
- [ ] `frontend/stock.html`
- [ ] `frontend/ventas.html`
- [ ] `frontend/historial.html`
- [ ] `frontend/dashboard.html`
- [ ] `frontend/vendedores.html`

**Criterios WCAG a verificar**:
- 1.1.1 Contenido no textual (imágenes con alt)
- 1.3.1 Información y relaciones (semántica HTML)
- 1.4.3 Contraste mínimo (4.5:1 / 3:1)
- 2.1.1 Teclado (todos los elementos operables por teclado)
- 2.4.1 Ignorar bloques (saltar navegación)
- 2.4.3 Focus visible
- 4.1.2 Nombre, rol, valor (ARIA)

### 1.2 Auditoría Manual

**Checklist**:
- [ ] Navegación completa por Tab
- [ ] Zoom 200% en Chrome DevTools
- [ ] Verificar `prefers-reduced-motion`
- [ ] Verificar `prefers-color-scheme` (dark/light)

---

## Fase 2: Corrección en Stitch

### 2.1 Sistema de Diseño

**Acciones**:
1. Actualizar tokens de color con ratios ≥ 4.5:1
2. Definir jerarquía tipográfica (mínimo 16px body)
3. Crear sistema de focus visible

**Colores a verificar**:
- [ ] Color primario (botones, links)
- [ ] Color secundario (iconos, badges)
- [ ] Color de fondo (dark mode)
- [ ] Texto sobre fondo

### 2.2 Corrección de Pantallas

| Pantalla | Prioridad | Problemas Comunes |
|----------|-----------|-------------------|
| login.html | ALTA | Contraste glassmorphism, focus inputs |
| stock.html | ALTA | Cards interactivas, filtros |
| ventas.html | ALTA | Formularios, modales |
| historial.html | MEDIA | Tablas, paginación |
| dashboard.html | MEDIA | Gráficos, tooltips |
| vendedores.html | MEDIA | Formularios CRUD |
| index.html | BAJA | Navegación principal |

---

## Fase 3: Verificación Final

### 3.1 Tests Automatizados

```javascript
// tests/a11y_audit.test.js
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = [
  'login.html',
  'index.html',
  'stock.html',
  'ventas.html',
  'historial.html',
  'dashboard.html',
  'vendedores.html'
];

for (const page of PAGES) {
  test(`${page} passes accessibility audit`, async ({ page }) => {
    await page.goto(`file://${__dirname}/../${page}`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });
}
```

### 3.2 Validación Manual

- [ ] Todas las vistas pasan axe-core (0 violaciones)
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Navegación por teclado completa
- [ ] Zoom 200% funcional
- [ ] Modales con focus trap

---

## Timeline Estimado

| Fase | Duración | Entregable |
|------|----------|------------|
| Auditoría Inicial | 2 horas | Reporte de issues |
| Corrección Stitch | 1 día | Diseños actualizados |
| Implementación | 2 días | HTML/CSS corregido |
| Verificación | 1 día | Tests passing |

**Total estimado**: 4-5 días

---

*Documento actualizado: 2026-04-07*
