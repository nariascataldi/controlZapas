# Librerías y MCPs para Accesibilidad (A11y)

Este documento lista todas las herramientas, librerías y MCPs necesarios para implementar accesibilidad en **Control Zapas**.

---

## 🛠️ Librerías de Testing A11y

### axe-core / @axe-core/playwright

**Propósito**: Auditoría automatizada de accesibilidad integrada en Playwright

```bash
npm install @axe-core/playwright
```

**Uso en tests**:
```javascript
const AxeBuilder = require('@axe-core/playwright').default;

async function runA11yAudit(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  return results;
}
```

### Playwright

**Propósito**: Testing E2E con herramientas de accesibilidad integradas

```bash
npm install @playwright/test
npx playwright install
```

**Funciones A11y**:
- `page.getByRole()` - Selectores semánticos
- `page.locator('button')` - Elementos semánticos
- `page.keyboard` - Simulación de navegación por teclado
- `page.zoom()` - Testing de escalabilidad

### Lighthouse (Google)

**Propósito**: Auditoría completa de Performance, Accessibility, Best Practices, SEO

```bash
npm install lighthouse
```

**Uso**:
```bash
# CLI
lighthouse http://localhost:3000/stock.html --output=html --output-path=./a11y-report.html
```

---

## 🌐 Extensiones de Navegador

### WAVE Evaluation Tool

- **Navegadores**: Chrome, Firefox
- **Web**: https://wave.webaim.org/extension/
- **Propósito**: Evaluación visual de accesibilidad, iconos de error/alerta directamente en la página

### Accessibility Insights for Web

- **Navegador**: Chrome, Edge
- **Web**: https://accessibilityinsights.io/
- **Propósito**: Detección de problemas de contraste, focus, semántica ARIA

### Color Contrast Checker

- **Web**: https://webaim.org/resources/contrastchecker/
- **Propósito**: Verificar ratios de contraste en tiempo real

---

## 🔧 MCPs (Model Context Protocol)

### Stitch MCP

| Propiedad | Valor |
|-----------|-------|
| **Project ID** | `14037293779698532808` |
| **Propósito** | Generación de pantallas y prototipos de alta fidelidad |
| **Capacidades A11y** | Tokens de contraste, jerarquía visual, semántica |

**Funciones disponibles**:
- `stitch_get_project` - Obtener proyecto
- `stitch_generate_screen_from_text` - Generar pantallas con prompts A11y
- `stitch_create_design_system` - Crear sistema de diseño con colores accesibles
- `stitch_update_design_system` - Actualizar tokens de contraste

### Chrome DevTools MCP

**Propósito**: Testing manual, navegación por teclado, screenshots de accesibilidad

**Funciones útiles para A11y**:
- `chrome-devtools_take_snapshot` - Capturar estructura semántica
- `chrome-devtools_press_key` - Simular Tab, Enter, Escape
- `chrome-devtools_emulate` - Emular prefers-reduced-motion, colorScheme
- `chrome-devtools_lighthouse_audit` - Auditoría Lighthouse integrada

### Supabase MCP

**Propósito**: Verificar que las Row Level Security (RLS) policies sean accesibles

**Funciones útiles**:
- `supabase_get_advisors(type: "security")` - Verificar policies
- `supabase_execute_sql` - Verificar queries compatibles con lectores de pantalla

---

## 📦 Dependencias para package.json (Frontend)

```json
{
  "devDependencies": {
    "@axe-core/playwright": "^4.8.0",
    "@playwright/test": "^1.40.0",
    "jest": "^29.7.0",
    "jest-playwright": "^10.0.0"
  }
}
```

---

## 🎨 Herramientas de Diseño Accesible

### Focus Indicator Bookmarklet

```javascript
javascript:(function(){const%20s=document.createElement('style');s.innerHTML='*:focus{outline:3px%20solid%20red!important;background:rgba(255,0,0,0.1)!important;}';document.head.appendChild(s);})();
```

### Prefers Color Scheme Detection

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}

@media (prefers-color-scheme: light) {
  /* Light mode styles */
}
```

### Reduced Motion Detection

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📋 Checklist de Librerías por Fase

### Fase 1: Setup
- [ ] Instalar `@axe-core/playwright`
- [ ] Instalar `@playwright/test`
- [ ] Configurar Lighthouse CLI
- [ ] Instalar extensiones de navegador (WAVE, Accessibility Insights)

### Fase 2: Testing Automatizado
- [ ] Crear `tests/a11y.test.js` con axe-core
- [ ] Configurar Playwright para testing E2E
- [ ] Integrar Lighthouse en CI/CD

### Fase 3: Validación Manual
- [ ] Usar WAVE para evaluación visual
- [ ] Usar Accessibility Insights para problemas complejos
- [ ] Verificar contraste con Color Contrast Checker

---

*Documento actualizado: 2026-04-07*
