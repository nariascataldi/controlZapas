# Plan de Implementación: Accesibilidad y Estándares ISO/WCAG

> **Carpeta de referencia**: `.antigravity/a11y/`
> Este plan documenta la estrategia para transformar el proyecto **Control Zapas** en un sistema 100% inclusivo, cumpliendo con **WCAG 2.1 (Nivel AA)** y **ISO 30071-1**.

---

## 📁 Estructura de Documentos

```
.antigravity/a11y/
├── IMPLEMENTATION_PLAN_A11Y.md   # Este documento (resumen)
├── IMPLEMENTATION_PLAN_DETAIL.md  # Plan detallado de ejecución
├── ROLES_A11Y.md                 # Responsabilidades del staff
├── LIBRARIES_MCP.md               # Librerías y herramientas MCP
└── CHECKLIST_A11Y.md             # Checklist de verificación
```

---

## 👥 Staff (Equipo Responsable)

| Rol | Agente | Responsabilidad A11y |
|-----|--------|---------------------|
| **Director** | Director | Aprobación de cambios en Stitch, priorización de tareas |
| **Frontend** | Frontend | Diseño accesible con Stitch, ARIA labels, semántica HTML5, focus management |
| **FrontendTester** | FrontendTester | Auditorías axe-core, testing manual (teclado, zoom 200%), validación WCAG |
| **Revisor** | Revisor | Code review A11y, detección de regresiones visuales/accesibles |
| **QA** | QA | Validación de metas A11y, 100% errores críticos/serios corregidos |
| **DB** | DB | Asegurar que queries sean compatibles con lectores de pantalla |

---

## 📚 othersCalled (Artefactos Relacionados)

| Artefacto | Ubicación | Propósito |
|-----------|-----------|-----------|
| `IMPLEMENTATION_PLAN_DETAIL.md` | `.antigravity/a11y/` | Plan detallado de ejecución |
| `ROLES_A11Y.md` | `.antigravity/a11y/` | Detalle de roles y responsabilidades |
| `LIBRARIES_MCP.md` | `.antigravity/a11y/` | Librerías, MCPs y herramientas |
| `CHECKLIST_A11Y.md` | `.antigravity/a11y/` | Checklist de verificación |
| `roles/Frontend.md` | `.antigravity/team/roles/` | Estándares WCAG, POUR, ratios de contraste |
| `roles/FrontendTester.md` | `.antigravity/team/roles/` | Testing con axe-core, Lighthouse, WAVE |
| `team/scratchpad.md` | `.antigravity/team/` | Checklist QA A11y (líneas 107-111) |
| `tasks.json` | `.antigravity/team/` | Tareas de testing responsivo (IDs 60-66, pendientes) |

---

## 🛠️ Librerías y MCPs

### Librerías de Testing

| Librería | Propósito | Instalación |
|----------|----------|------------|
| **axe-core** | Auditoría automatizada de accesibilidad | `npm install @axe-core/playwright` |
| **Playwright** | Testing E2E con soporte A11y integrado | `npm install playwright` |
| **Lighthouse** | Auditoría completa (Performance + A11y) | CLI o extensión Chrome |
| **WAVE** | Evaluación visual de accesibilidad | Extensión Chrome/Firefox |
| **Accessibility Insights** | Detección de problemas complejos | Extensión Chrome |

### MCPs (Model Context Protocol)

| MCP | Propósito | Documentación |
|-----|----------|---------------|
| **Stitch (MCP)** | Generación de pantallas y prototipos accesibles | Project ID: `14037293779698532808` |
| **Chrome DevTools (MCP)** | Testing manual, navegación por teclado, screenshots | Integrado en navegador |
| **Supabase (MCP)** | Verificación de RLS policies y acceso a datos | Integrado |

### Herramientas de Diseño Accesible

| Herramienta | Propósito |
|-------------|----------|
| **Stitch** | Crear base visual con contrastes y jerarquías correctas |
| **Color Contrast Checker** | Verificar ratios 4.5:1 (texto) y 3:1 (texto grande) |
| **Focus Indicator Bookmarklet** | Verificar visibilidad de focus en elementos interactivos |

---

## 📋 Resumen de Fases

### Fase 1: Documentación ✅ COMPLETADA
- [x] Roles de Frontend y FrontendTester actualizados con estándares A11y
- [x] Metas A11y incluidas en scratchpad (QA)
- [x] Declaración de cumplimiento en README.md

### Fase 2: Ejecución en Stitch ⏳ PENDIENTE DE APROBACIÓN
- **Sistema de Diseño**: Actualizar tokens de contraste y reglas de legibilidad
- **Pantallas**: Auditoría y corrección masiva de componentes

### Fase 3: Verificación ⏳ PENDIENTE
- Auditoría automatizada con **axe-core**
- Pruebas manuales: navegación por teclado, zoom 200%

---

## ❓ Preguntas para el Usuario

- ¿Nivel de cumplimiento: **AA** (estándar) o **AAA** (riguroso)?
- ¿Deseas un reporte inicial de accesibilidad antes de los cambios en Stitch?
- ¿Timeline estimado por fase?

---

*Para seguimiento detallado, ver `IMPLEMENTATION_PLAN_DETAIL.md` en `.antigravity/a11y/`.*
